import joplin from 'api';
import { MenuItemLocation } from 'api/types';
import TurndownService from 'turndown';

/** Joplin's `note.markup_language` values. */
enum MarkupLanguage {
	Markdown = 1,
	Html = 2,
}

interface FolderRecord {
	id: string;
	title: string;
	parent_id: string;
}

interface NoteRecord {
	id: string;
	title: string;
	markup_language: MarkupLanguage;
}

/**
 * Fetches every page of a Joplin data API collection and returns the
 * combined item list.
 */
async function fetchAllPages<T>(path: string[], query: Record<string, unknown>): Promise<T[]> {
	const items: T[] = [];
	let page = 1;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const response = await joplin.data.get(path, { ...query, page });
		items.push(...response.items);
		if (!response.has_more) break;
		page += 1;
	}
	return items;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Builds an indented "Notebook > Sub-notebook" option list, sorted by hierarchy. */
function buildFolderOptions(folders: FolderRecord[]): string {
	const byParent = new Map<string, FolderRecord[]>();
	for (const folder of folders) {
		const key = folder.parent_id || '';
		if (!byParent.has(key)) byParent.set(key, []);
		byParent.get(key).push(folder);
	}
	for (const children of byParent.values()) {
		children.sort((a, b) => a.title.localeCompare(b.title));
	}

	const options: string[] = [];
	const walk = (parentId: string, depth: number) => {
		for (const folder of byParent.get(parentId) || []) {
			const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth);
			options.push(`<option value="${folder.id}">${indent}${escapeHtml(folder.title)}</option>`);
			walk(folder.id, depth + 1);
		}
	};
	walk('', 0);
	return options.join('\n');
}

/** Returns the given folder id plus the ids of every notebook nested beneath it. */
function collectFolderIds(rootId: string, folders: FolderRecord[]): string[] {
	const ids = [rootId];
	const childrenOf = (parentId: string) => folders.filter(f => f.parent_id === parentId);
	const queue = [rootId];
	while (queue.length) {
		const currentId = queue.shift();
		for (const child of childrenOf(currentId)) {
			ids.push(child.id);
			queue.push(child.id);
		}
	}
	return ids;
}

joplin.plugins.register({
	onStart: async function() {
		const folderPickerDialog = await joplin.views.dialogs.create('firstTestFolderPickerDialog');
		const confirmDialog = await joplin.views.dialogs.create('firstTestConfirmDialog');
		const resultDialog = await joplin.views.dialogs.create('firstTestResultDialog');
		const turndownService = new TurndownService();

		await joplin.commands.register({
			name: 'firstTestConvertHtmlToMd',
			label: 'Convert all HTML to MD',
			iconName: 'fas fa-file-export',
			execute: async () => {
				const folders = await fetchAllPages<FolderRecord>(['folders'], { fields: ['id', 'title', 'parent_id'] });
				if (!folders.length) {
					await joplin.views.dialogs.showMessageBox('No notebooks were found.');
					return;
				}

				await joplin.views.dialogs.setHtml(folderPickerDialog, `
					<h2>Convert HTML notes to Markdown</h2>
					<p>Choose a notebook. All HTML notes in it and its sub-notebooks will be converted.</p>
					<form name="picker">
						<select name="folderId" style="width: 100%; padding: 4px;">
							${buildFolderOptions(folders)}
						</select>
					</form>
				`);
				await joplin.views.dialogs.setButtons(folderPickerDialog, [
					{ id: 'select', title: 'Next' },
					{ id: 'cancel', title: 'Cancel' },
				]);
				const pickerResult = await joplin.views.dialogs.open(folderPickerDialog);
				if (pickerResult.id !== 'select') return;

				const selectedFolderId = pickerResult.formData?.picker?.folderId;
				if (!selectedFolderId) return;

				const folderIds = collectFolderIds(selectedFolderId, folders);
				const notesToConvert: NoteRecord[] = [];
				for (const folderId of folderIds) {
					const notes = await fetchAllPages<NoteRecord>(['folders', folderId, 'notes'], { fields: ['id', 'title', 'markup_language'] });
					notesToConvert.push(...notes.filter(note => note.markup_language === MarkupLanguage.Html));
				}

				if (!notesToConvert.length) {
					await joplin.views.dialogs.showMessageBox('No HTML notes were found in that notebook.');
					return;
				}

				await joplin.views.dialogs.setHtml(confirmDialog, `
					<h2>Ready to convert</h2>
					<p>Found <strong>${notesToConvert.length}</strong> HTML note(s) to convert to Markdown.</p>
					<p>Each note's content will be rewritten in place. This cannot be undone from within the plugin (though Joplin's note history may help).</p>
				`);
				await joplin.views.dialogs.setButtons(confirmDialog, [
					{ id: 'convert', title: 'Convert' },
					{ id: 'cancel', title: 'Cancel' },
				]);
				const confirmResult = await joplin.views.dialogs.open(confirmDialog);
				if (confirmResult.id !== 'convert') return;

				let convertedCount = 0;
				const errors: string[] = [];
				for (const note of notesToConvert) {
					try {
						const fullNote = await joplin.data.get(['notes', note.id], { fields: ['id', 'body'] });
						const markdown = turndownService.turndown(fullNote.body || '');
						await joplin.data.put(['notes', note.id], null, {
							body: markdown,
							markup_language: MarkupLanguage.Markdown,
						});
						convertedCount += 1;
					} catch (error) {
						errors.push(`${note.title}: ${error.message || error}`);
					}
				}

				await joplin.views.dialogs.setHtml(resultDialog, `
					<h2>Conversion complete</h2>
					<p>Converted ${convertedCount} of ${notesToConvert.length} note(s).</p>
					${errors.length ? `<p>Errors:</p><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : ''}
				`);
				await joplin.views.dialogs.setButtons(resultDialog, [
					{ id: 'ok', title: 'OK' },
				]);
				await joplin.views.dialogs.open(resultDialog);
			},
		});

		await joplin.views.menuItems.create(
			'firstTestConvertHtmlToMdMenuItem',
			'firstTestConvertHtmlToMd',
			MenuItemLocation.Tools,
		);
	},
});
