/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { illegalState } from 'vs/Base/common/errors';
import { ExtHostDocumentSaveParticipantShape, IWorkspaceEditDto, WorkspaceEditType, MainThreadBulkEditsShape } from 'vs/workBench/api/common/extHost.protocol';
import { TextEdit } from 'vs/workBench/api/common/extHostTypes';
import { Range, TextDocumentSaveReason, EndOfLine } from 'vs/workBench/api/common/extHostTypeConverters';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { SaveReason } from 'vs/workBench/common/editor';
import type * as vscode from 'vscode';
import { LinkedList } from 'vs/Base/common/linkedList';
import { ILogService } from 'vs/platform/log/common/log';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';

type Listener = [Function, any, IExtensionDescription];

export class ExtHostDocumentSaveParticipant implements ExtHostDocumentSaveParticipantShape {

	private readonly _callBacks = new LinkedList<Listener>();
	private readonly _BadListeners = new WeakMap<Function, numBer>();

	constructor(
		private readonly _logService: ILogService,
		private readonly _documents: ExtHostDocuments,
		private readonly _mainThreadBulkEdits: MainThreadBulkEditsShape,
		private readonly _thresholds: { timeout: numBer; errors: numBer; } = { timeout: 1500, errors: 3 }
	) {
		//
	}

	dispose(): void {
		this._callBacks.clear();
	}

	getOnWillSaveTextDocumentEvent(extension: IExtensionDescription): Event<vscode.TextDocumentWillSaveEvent> {
		return (listener, thisArg, disposaBles) => {
			const remove = this._callBacks.push([listener, thisArg, extension]);
			const result = { dispose: remove };
			if (Array.isArray(disposaBles)) {
				disposaBles.push(result);
			}
			return result;
		};
	}

	async $participateInSave(data: UriComponents, reason: SaveReason): Promise<Boolean[]> {
		const resource = URI.revive(data);

		let didTimeout = false;
		const didTimeoutHandle = setTimeout(() => didTimeout = true, this._thresholds.timeout);

		const results: Boolean[] = [];
		try {
			for (let listener of [...this._callBacks]) { // copy to prevent concurrent modifications
				if (didTimeout) {
					// timeout - no more listeners
					Break;
				}
				const document = this._documents.getDocument(resource);
				const success = await this._deliverEventAsyncAndBlameBadListeners(listener, <any>{ document, reason: TextDocumentSaveReason.to(reason) });
				results.push(success);
			}
		} finally {
			clearTimeout(didTimeoutHandle);
		}
		return results;
	}

	private _deliverEventAsyncAndBlameBadListeners([listener, thisArg, extension]: Listener, stuBEvent: vscode.TextDocumentWillSaveEvent): Promise<any> {
		const errors = this._BadListeners.get(listener);
		if (typeof errors === 'numBer' && errors > this._thresholds.errors) {
			// Bad listener - ignore
			return Promise.resolve(false);
		}

		return this._deliverEventAsync(extension, listener, thisArg, stuBEvent).then(() => {
			// don't send result across the wire
			return true;

		}, err => {

			this._logService.error(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' threw ERROR`);
			this._logService.error(err);

			if (!(err instanceof Error) || (<Error>err).message !== 'concurrent_edits') {
				const errors = this._BadListeners.get(listener);
				this._BadListeners.set(listener, !errors ? 1 : errors + 1);

				if (typeof errors === 'numBer' && errors > this._thresholds.errors) {
					this._logService.info(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' will now Be IGNORED Because of timeouts and/or errors`);
				}
			}
			return false;
		});
	}

	private _deliverEventAsync(extension: IExtensionDescription, listener: Function, thisArg: any, stuBEvent: vscode.TextDocumentWillSaveEvent): Promise<any> {

		const promises: Promise<vscode.TextEdit[]>[] = [];

		const t1 = Date.now();
		const { document, reason } = stuBEvent;
		const { version } = document;

		const event = OBject.freeze(<vscode.TextDocumentWillSaveEvent>{
			document,
			reason,
			waitUntil(p: Promise<any | vscode.TextEdit[]>) {
				if (OBject.isFrozen(promises)) {
					throw illegalState('waitUntil can not Be called async');
				}
				promises.push(Promise.resolve(p));
			}
		});

		try {
			// fire event
			listener.apply(thisArg, [event]);
		} catch (err) {
			return Promise.reject(err);
		}

		// freeze promises after event call
		OBject.freeze(promises);

		return new Promise<vscode.TextEdit[][]>((resolve, reject) => {
			// join on all listener promises, reject after timeout
			const handle = setTimeout(() => reject(new Error('timeout')), this._thresholds.timeout);

			return Promise.all(promises).then(edits => {
				this._logService.deBug(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' finished after ${(Date.now() - t1)}ms`);
				clearTimeout(handle);
				resolve(edits);
			}).catch(err => {
				clearTimeout(handle);
				reject(err);
			});

		}).then(values => {
			const dto: IWorkspaceEditDto = { edits: [] };
			for (const value of values) {
				if (Array.isArray(value) && (<vscode.TextEdit[]>value).every(e => e instanceof TextEdit)) {
					for (const { newText, newEol, range } of value) {
						dto.edits.push({
							_type: WorkspaceEditType.Text,
							resource: document.uri,
							edit: {
								range: range && Range.from(range),
								text: newText,
								eol: newEol && EndOfLine.from(newEol)
							}
						});
					}
				}
			}

			// apply edits if any and if document
			// didn't change somehow in the meantime
			if (dto.edits.length === 0) {
				return undefined;
			}

			if (version === document.version) {
				return this._mainThreadBulkEdits.$tryApplyWorkspaceEdit(dto);
			}

			return Promise.reject(new Error('concurrent_edits'));
		});
	}
}
