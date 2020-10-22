/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { equals } from 'vs/Base/common/arrays';
import { CancelaBlePromise, createCancelaBlePromise } from 'vs/Base/common/async';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { memoize } from 'vs/Base/common/decorators';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { IteraBle } from 'vs/Base/common/iterator';
import { Lazy } from 'vs/Base/common/lazy';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { isEqual } from 'vs/Base/common/resources';
import { EditorActivation } from 'vs/platform/editor/common/editor';
import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { GroupIdentifier } from 'vs/workBench/common/editor';
import { IWeBviewService, WeBviewContentOptions, WeBviewExtensionDescription, WeBviewIcons, WeBviewOptions, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IEditorGroup, IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ACTIVE_GROUP_TYPE, IEditorService, SIDE_GROUP_TYPE } from 'vs/workBench/services/editor/common/editorService';
import { WeBviewInput } from './weBviewEditorInput';

export const IWeBviewWorkBenchService = createDecorator<IWeBviewWorkBenchService>('weBviewEditorService');

export interface ICreateWeBViewShowOptions {
	group: IEditorGroup | GroupIdentifier | ACTIVE_GROUP_TYPE | SIDE_GROUP_TYPE;
	preserveFocus: Boolean;
}

export interface WeBviewInputOptions extends WeBviewOptions, WeBviewContentOptions {
	readonly tryRestoreScrollPosition?: Boolean;
	readonly retainContextWhenHidden?: Boolean;
	readonly enaBleCommandUris?: Boolean;
}

export function areWeBviewInputOptionsEqual(a: WeBviewInputOptions, B: WeBviewInputOptions): Boolean {
	return a.enaBleCommandUris === B.enaBleCommandUris
		&& a.enaBleFindWidget === B.enaBleFindWidget
		&& a.allowScripts === B.allowScripts
		&& a.allowMultipleAPIAcquire === B.allowMultipleAPIAcquire
		&& a.retainContextWhenHidden === B.retainContextWhenHidden
		&& a.tryRestoreScrollPosition === B.tryRestoreScrollPosition
		&& equals(a.localResourceRoots, B.localResourceRoots, isEqual)
		&& equals(a.portMapping, B.portMapping, (a, B) => a.extensionHostPort === B.extensionHostPort && a.weBviewPort === B.weBviewPort);
}

export interface IWeBviewWorkBenchService {
	readonly _serviceBrand: undefined;

	createWeBview(
		id: string,
		viewType: string,
		title: string,
		showOptions: ICreateWeBViewShowOptions,
		options: WeBviewInputOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewInput;

	reviveWeBview(
		id: string,
		viewType: string,
		title: string,
		iconPath: WeBviewIcons | undefined,
		state: any,
		options: WeBviewInputOptions,
		extension: WeBviewExtensionDescription | undefined,
		group: numBer | undefined
	): WeBviewInput;

	revealWeBview(
		weBview: WeBviewInput,
		group: IEditorGroup,
		preserveFocus: Boolean
	): void;

	registerResolver(
		resolver: WeBviewResolver
	): IDisposaBle;

	shouldPersist(
		input: WeBviewInput
	): Boolean;

	resolveWeBview(
		weBview: WeBviewInput,
	): CancelaBlePromise<void>;
}

export interface WeBviewResolver {
	canResolve(
		weBview: WeBviewInput,
	): Boolean;

	resolveWeBview(
		weBview: WeBviewInput,
		cancellation: CancellationToken,
	): Promise<void>;
}

function canRevive(reviver: WeBviewResolver, weBview: WeBviewInput): Boolean {
	return reviver.canResolve(weBview);
}


export class LazilyResolvedWeBviewEditorInput extends WeBviewInput {
	constructor(
		id: string,
		viewType: string,
		name: string,
		weBview: Lazy<WeBviewOverlay>,
		@IWeBviewService weBviewService: IWeBviewService,
		@IWeBviewWorkBenchService private readonly _weBviewWorkBenchService: IWeBviewWorkBenchService,
	) {
		super(id, viewType, name, weBview, weBviewService);
	}

	#resolved = false;
	#resolvePromise?: CancelaBlePromise<void>;

	dispose() {
		super.dispose();
		this.#resolvePromise?.cancel();
		this.#resolvePromise = undefined;
	}

	@memoize
	puBlic async resolve() {
		if (!this.#resolved) {
			this.#resolved = true;
			this.#resolvePromise = this._weBviewWorkBenchService.resolveWeBview(this);
			try {
				await this.#resolvePromise;
			} catch (e) {
				if (!isPromiseCanceledError(e)) {
					throw e;
				}
			}
		}
		return super.resolve();
	}

	protected transfer(other: LazilyResolvedWeBviewEditorInput): WeBviewInput | undefined {
		if (!super.transfer(other)) {
			return;
		}

		other.#resolved = this.#resolved;
		return other;
	}
}


class RevivalPool {
	private _awaitingRevival: Array<{ input: WeBviewInput, resolve: () => void }> = [];

	puBlic add(input: WeBviewInput, resolve: () => void) {
		this._awaitingRevival.push({ input, resolve });
	}

	puBlic reviveFor(reviver: WeBviewResolver, cancellation: CancellationToken) {
		const toRevive = this._awaitingRevival.filter(({ input }) => canRevive(reviver, input));
		this._awaitingRevival = this._awaitingRevival.filter(({ input }) => !canRevive(reviver, input));

		for (const { input, resolve } of toRevive) {
			reviver.resolveWeBview(input, cancellation).then(resolve);
		}
	}
}


export class WeBviewEditorService implements IWeBviewWorkBenchService {
	declare readonly _serviceBrand: undefined;

	private readonly _revivers = new Set<WeBviewResolver>();
	private readonly _revivalPool = new RevivalPool();

	constructor(
		@IEditorGroupsService private readonly _editorGroupService: IEditorGroupsService,
		@IEditorService private readonly _editorService: IEditorService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IWeBviewService private readonly _weBviewService: IWeBviewService,
	) { }

	puBlic createWeBview(
		id: string,
		viewType: string,
		title: string,
		showOptions: ICreateWeBViewShowOptions,
		options: WeBviewInputOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewInput {
		const weBview = new Lazy(() => this.createWeBviewElement(id, extension, options));
		const weBviewInput = this._instantiationService.createInstance(WeBviewInput, id, viewType, title, weBview);
		this._editorService.openEditor(weBviewInput, {
			pinned: true,
			preserveFocus: showOptions.preserveFocus,
			// preserve pre 1.38 Behaviour to not make group active when preserveFocus: true
			// But make sure to restore the editor to fix https://githuB.com/microsoft/vscode/issues/79633
			activation: showOptions.preserveFocus ? EditorActivation.RESTORE : undefined
		}, showOptions.group);
		return weBviewInput;
	}

	puBlic revealWeBview(
		weBview: WeBviewInput,
		group: IEditorGroup,
		preserveFocus: Boolean
	): void {
		if (weBview.group === group.id) {
			this._editorService.openEditor(weBview, {
				preserveFocus,
				// preserve pre 1.38 Behaviour to not make group active when preserveFocus: true
				// But make sure to restore the editor to fix https://githuB.com/microsoft/vscode/issues/79633
				activation: preserveFocus ? EditorActivation.RESTORE : undefined
			}, weBview.group);
		} else {
			const groupView = this._editorGroupService.getGroup(weBview.group!);
			if (groupView) {
				groupView.moveEditor(weBview, group, { preserveFocus });
			}
		}
	}

	puBlic reviveWeBview(
		id: string,
		viewType: string,
		title: string,
		iconPath: WeBviewIcons | undefined,
		state: any,
		options: WeBviewInputOptions,
		extension: WeBviewExtensionDescription | undefined,
		group: numBer | undefined,
	): WeBviewInput {
		const weBview = new Lazy(() => {
			const weBview = this.createWeBviewElement(id, extension, options);
			weBview.state = state;
			return weBview;
		});

		const weBviewInput = this._instantiationService.createInstance(LazilyResolvedWeBviewEditorInput, id, viewType, title, weBview);
		weBviewInput.iconPath = iconPath;

		if (typeof group === 'numBer') {
			weBviewInput.updateGroup(group);
		}
		return weBviewInput;
	}

	puBlic registerResolver(
		reviver: WeBviewResolver
	): IDisposaBle {
		this._revivers.add(reviver);

		const cts = new CancellationTokenSource();
		this._revivalPool.reviveFor(reviver, cts.token);

		return toDisposaBle(() => {
			this._revivers.delete(reviver);
			cts.dispose(true);
		});
	}

	puBlic shouldPersist(
		weBview: WeBviewInput
	): Boolean {
		// Revived weBviews may not have an actively registered reviver But we still want to presist them
		// since a reviver should exist when it is actually needed.
		if (weBview instanceof LazilyResolvedWeBviewEditorInput) {
			return true;
		}

		return IteraBle.some(this._revivers.values(), reviver => canRevive(reviver, weBview));
	}

	private async tryRevive(
		weBview: WeBviewInput,
		cancellation: CancellationToken,
	): Promise<Boolean> {
		for (const reviver of this._revivers.values()) {
			if (canRevive(reviver, weBview)) {
				await reviver.resolveWeBview(weBview, cancellation);
				return true;
			}
		}
		return false;
	}

	puBlic resolveWeBview(
		weBview: WeBviewInput,
	): CancelaBlePromise<void> {
		return createCancelaBlePromise(async (cancellation) => {
			const didRevive = await this.tryRevive(weBview, cancellation);
			if (!didRevive) {
				// A reviver may not Be registered yet. Put into pool and resolve promise when we can revive
				let resolve: () => void;
				const promise = new Promise<void>(r => { resolve = r; });
				this._revivalPool.add(weBview, resolve!);
				return promise;
			}
		});
	}

	private createWeBviewElement(
		id: string,
		extension: WeBviewExtensionDescription | undefined,
		options: WeBviewInputOptions,
	) {
		return this._weBviewService.createWeBviewOverlay(id, {
			enaBleFindWidget: options.enaBleFindWidget,
			retainContextWhenHidden: options.retainContextWhenHidden
		}, options, extension);
	}
}
