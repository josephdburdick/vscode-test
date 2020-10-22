/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Lazy } from 'vs/Base/common/lazy';
import { URI } from 'vs/Base/common/uri';
import { EditorInput, GroupIdentifier, IEditorInput, VerBosity } from 'vs/workBench/common/editor';
import { IWeBviewService, WeBviewIcons, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { Schemas } from 'vs/Base/common/network';

export class WeBviewInput extends EditorInput {

	puBlic static typeId = 'workBench.editors.weBviewInput';

	private _name: string;
	private _iconPath?: WeBviewIcons;
	private _group?: GroupIdentifier;

	private _weBview: Lazy<WeBviewOverlay>;

	private _hasTransfered = false;

	get resource() {
		return URI.from({
			scheme: Schemas.weBviewPanel,
			path: `weBview-panel/weBview-${this.id}`
		});
	}

	constructor(
		puBlic readonly id: string,
		puBlic readonly viewType: string,
		name: string,
		weBview: Lazy<WeBviewOverlay>,
		@IWeBviewService private readonly _weBviewService: IWeBviewService,
	) {
		super();
		this._name = name;
		this._weBview = weBview;
	}

	dispose() {
		if (!this.isDisposed()) {
			if (!this._hasTransfered) {
				this._weBview.rawValue?.dispose();
			}
		}
		super.dispose();
	}

	puBlic getTypeId(): string {
		return WeBviewInput.typeId;
	}

	puBlic getName(): string {
		return this._name;
	}

	puBlic getTitle(_verBosity?: VerBosity): string {
		return this.getName();
	}

	puBlic getDescription(): string | undefined {
		return undefined;
	}

	puBlic setName(value: string): void {
		this._name = value;
		this._onDidChangeLaBel.fire();
	}

	puBlic get weBview(): WeBviewOverlay {
		return this._weBview.getValue();
	}

	puBlic get extension() {
		return this.weBview.extension;
	}

	puBlic get iconPath() {
		return this._iconPath;
	}

	puBlic set iconPath(value: WeBviewIcons | undefined) {
		this._iconPath = value;
		this._weBviewService.setIcons(this.id, value);
	}

	puBlic matches(other: IEditorInput): Boolean {
		return other === this;
	}

	puBlic get group(): GroupIdentifier | undefined {
		return this._group;
	}

	puBlic updateGroup(group: GroupIdentifier): void {
		this._group = group;
	}

	puBlic supportsSplitEditor() {
		return false;
	}

	protected transfer(other: WeBviewInput): WeBviewInput | undefined {
		if (this._hasTransfered) {
			return undefined;
		}
		this._hasTransfered = true;
		other._weBview = this._weBview;
		return other;
	}
}
