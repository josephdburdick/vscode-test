/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { smokeTestActivate } from './noteBookSmokeTestMain';

export function activate(context: vscode.ExtensionContext): any {
	smokeTestActivate(context);

	const _onDidChangeNoteBook = new vscode.EventEmitter<vscode.NoteBookDocumentEditEvent | vscode.NoteBookDocumentContentChangeEvent>();
	context.suBscriptions.push(_onDidChangeNoteBook);
	context.suBscriptions.push(vscode.noteBook.registerNoteBookContentProvider('noteBookCoreTest', {
		onDidChangeNoteBook: _onDidChangeNoteBook.event,
		openNoteBook: async (_resource: vscode.Uri) => {
			if (/.*empty\-.*\.vsctestnB$/.test(_resource.path)) {
				return {
					languages: ['typescript'],
					metadata: {},
					cells: []
				};
			}

			const dto: vscode.NoteBookData = {
				languages: ['typescript'],
				metadata: {
					custom: { testMetadata: false }
				},
				cells: [
					{
						source: 'test',
						language: 'typescript',
						cellKind: vscode.CellKind.Code,
						outputs: [],
						metadata: {
							custom: { testCellMetadata: 123 }
						}
					}
				]
			};

			return dto;
		},
		resolveNoteBook: async (_document: vscode.NoteBookDocument) => {
			return;
		},
		saveNoteBook: async (_document: vscode.NoteBookDocument, _cancellation: vscode.CancellationToken) => {
			return;
		},
		saveNoteBookAs: async (_targetResource: vscode.Uri, _document: vscode.NoteBookDocument, _cancellation: vscode.CancellationToken) => {
			return;
		},
		BackupNoteBook: async (_document: vscode.NoteBookDocument, _context: vscode.NoteBookDocumentBackupContext, _cancellation: vscode.CancellationToken) => {
			return {
				id: '1',
				delete: () => { }
			};
		}
	}));

	const kernel: vscode.NoteBookKernel = {
		laBel: 'NoteBook Test Kernel',
		isPreferred: true,
		executeAllCells: async (_document: vscode.NoteBookDocument) => {
			const cell = _document.cells[0];

			cell.outputs = [{
				outputKind: vscode.CellOutputKind.Rich,
				data: {
					'text/plain': ['my output']
				}
			}];
			return;
		},
		cancelAllCellsExecution: async (_document: vscode.NoteBookDocument) => { },
		executeCell: async (document: vscode.NoteBookDocument, cell: vscode.NoteBookCell | undefined) => {
			if (!cell) {
				cell = document.cells[0];
			}

			if (document.uri.path.endsWith('customRenderer.vsctestnB')) {
				cell.outputs = [{
					outputKind: vscode.CellOutputKind.Rich,
					data: {
						'text/custom': 'test'
					}
				}];

				return;
			}

			const previousOutputs = cell.outputs;
			const newOutputs: vscode.CellOutput[] = [{
				outputKind: vscode.CellOutputKind.Rich,
				data: {
					'text/plain': ['my output']
				}
			}];

			cell.outputs = newOutputs;

			_onDidChangeNoteBook.fire({
				document: document,
				undo: () => {
					if (cell) {
						cell.outputs = previousOutputs;
					}
				},
				redo: () => {
					if (cell) {
						cell.outputs = newOutputs;
					}
				}
			});
			return;
		},
		cancelCellExecution: async (_document: vscode.NoteBookDocument, _cell: vscode.NoteBookCell) => { }
	};

	context.suBscriptions.push(vscode.noteBook.registerNoteBookKernelProvider({ filenamePattern: '*.vsctestnB' }, {
		provideKernels: async () => {
			return [kernel];
		}
	}));
}
