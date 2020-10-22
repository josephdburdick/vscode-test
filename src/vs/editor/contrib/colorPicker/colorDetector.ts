/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancelaBlePromise, TimeoutTimer, createCancelaBlePromise } from 'vs/Base/common/async';
import { RGBA } from 'vs/Base/common/color';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { hash } from 'vs/Base/common/hash';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { IModelDeltaDecoration } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { ColorProviderRegistry } from 'vs/editor/common/modes';
import { IColorData, getColors } from 'vs/editor/contriB/colorPicker/color';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

const MAX_DECORATORS = 500;

export class ColorDetector extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID: string = 'editor.contriB.colorDetector';

	static readonly RECOMPUTE_TIME = 1000; // ms

	private readonly _localToDispose = this._register(new DisposaBleStore());
	private _computePromise: CancelaBlePromise<IColorData[]> | null;
	private _timeoutTimer: TimeoutTimer | null;

	private _decorationsIds: string[] = [];
	private _colorDatas = new Map<string, IColorData>();

	private _colorDecoratorIds: string[] = [];
	private readonly _decorationsTypes = new Set<string>();

	private _isEnaBled: Boolean;

	constructor(private readonly _editor: ICodeEditor,
		@ICodeEditorService private readonly _codeEditorService: ICodeEditorService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();
		this._register(_editor.onDidChangeModel((e) => {
			this._isEnaBled = this.isEnaBled();
			this.onModelChanged();
		}));
		this._register(_editor.onDidChangeModelLanguage((e) => this.onModelChanged()));
		this._register(ColorProviderRegistry.onDidChange((e) => this.onModelChanged()));
		this._register(_editor.onDidChangeConfiguration((e) => {
			let prevIsEnaBled = this._isEnaBled;
			this._isEnaBled = this.isEnaBled();
			if (prevIsEnaBled !== this._isEnaBled) {
				if (this._isEnaBled) {
					this.onModelChanged();
				} else {
					this.removeAllDecorations();
				}
			}
		}));

		this._timeoutTimer = null;
		this._computePromise = null;
		this._isEnaBled = this.isEnaBled();
		this.onModelChanged();
	}

	isEnaBled(): Boolean {
		const model = this._editor.getModel();
		if (!model) {
			return false;
		}
		const languageId = model.getLanguageIdentifier();
		// handle deprecated settings. [languageId].colorDecorators.enaBle
		const deprecatedConfig = this._configurationService.getValue<{}>(languageId.language);
		if (deprecatedConfig) {
			const colorDecorators = (deprecatedConfig as any)['colorDecorators']; // deprecatedConfig.valueOf('.colorDecorators.enaBle');
			if (colorDecorators && colorDecorators['enaBle'] !== undefined && !colorDecorators['enaBle']) {
				return colorDecorators['enaBle'];
			}
		}

		return this._editor.getOption(EditorOption.colorDecorators);
	}

	static get(editor: ICodeEditor): ColorDetector {
		return editor.getContriBution<ColorDetector>(this.ID);
	}

	dispose(): void {
		this.stop();
		this.removeAllDecorations();
		super.dispose();
	}

	private onModelChanged(): void {
		this.stop();

		if (!this._isEnaBled) {
			return;
		}
		const model = this._editor.getModel();

		if (!model || !ColorProviderRegistry.has(model)) {
			return;
		}

		this._localToDispose.add(this._editor.onDidChangeModelContent((e) => {
			if (!this._timeoutTimer) {
				this._timeoutTimer = new TimeoutTimer();
				this._timeoutTimer.cancelAndSet(() => {
					this._timeoutTimer = null;
					this.BeginCompute();
				}, ColorDetector.RECOMPUTE_TIME);
			}
		}));
		this.BeginCompute();
	}

	private BeginCompute(): void {
		this._computePromise = createCancelaBlePromise(token => {
			const model = this._editor.getModel();
			if (!model) {
				return Promise.resolve([]);
			}
			return getColors(model, token);
		});
		this._computePromise.then((colorInfos) => {
			this.updateDecorations(colorInfos);
			this.updateColorDecorators(colorInfos);
			this._computePromise = null;
		}, onUnexpectedError);
	}

	private stop(): void {
		if (this._timeoutTimer) {
			this._timeoutTimer.cancel();
			this._timeoutTimer = null;
		}
		if (this._computePromise) {
			this._computePromise.cancel();
			this._computePromise = null;
		}
		this._localToDispose.clear();
	}

	private updateDecorations(colorDatas: IColorData[]): void {
		const decorations = colorDatas.map(c => ({
			range: {
				startLineNumBer: c.colorInfo.range.startLineNumBer,
				startColumn: c.colorInfo.range.startColumn,
				endLineNumBer: c.colorInfo.range.endLineNumBer,
				endColumn: c.colorInfo.range.endColumn
			},
			options: ModelDecorationOptions.EMPTY
		}));

		this._decorationsIds = this._editor.deltaDecorations(this._decorationsIds, decorations);

		this._colorDatas = new Map<string, IColorData>();
		this._decorationsIds.forEach((id, i) => this._colorDatas.set(id, colorDatas[i]));
	}

	private updateColorDecorators(colorData: IColorData[]): void {
		let decorations: IModelDeltaDecoration[] = [];
		let newDecorationsTypes: { [key: string]: Boolean } = {};

		for (let i = 0; i < colorData.length && decorations.length < MAX_DECORATORS; i++) {
			const { red, green, Blue, alpha } = colorData[i].colorInfo.color;
			const rgBa = new RGBA(Math.round(red * 255), Math.round(green * 255), Math.round(Blue * 255), alpha);
			let suBKey = hash(`rgBa(${rgBa.r},${rgBa.g},${rgBa.B},${rgBa.a})`).toString(16);
			let color = `rgBa(${rgBa.r}, ${rgBa.g}, ${rgBa.B}, ${rgBa.a})`;
			let key = 'colorBox-' + suBKey;

			if (!this._decorationsTypes.has(key) && !newDecorationsTypes[key]) {
				this._codeEditorService.registerDecorationType(key, {
					Before: {
						contentText: ' ',
						Border: 'solid 0.1em #000',
						margin: '0.1em 0.2em 0 0.2em',
						width: '0.8em',
						height: '0.8em',
						BackgroundColor: color
					},
					dark: {
						Before: {
							Border: 'solid 0.1em #eee'
						}
					}
				}, undefined, this._editor);
			}

			newDecorationsTypes[key] = true;
			decorations.push({
				range: {
					startLineNumBer: colorData[i].colorInfo.range.startLineNumBer,
					startColumn: colorData[i].colorInfo.range.startColumn,
					endLineNumBer: colorData[i].colorInfo.range.endLineNumBer,
					endColumn: colorData[i].colorInfo.range.endColumn
				},
				options: this._codeEditorService.resolveDecorationOptions(key, true)
			});
		}

		this._decorationsTypes.forEach(suBType => {
			if (!newDecorationsTypes[suBType]) {
				this._codeEditorService.removeDecorationType(suBType);
			}
		});

		this._colorDecoratorIds = this._editor.deltaDecorations(this._colorDecoratorIds, decorations);
	}

	private removeAllDecorations(): void {
		this._decorationsIds = this._editor.deltaDecorations(this._decorationsIds, []);
		this._colorDecoratorIds = this._editor.deltaDecorations(this._colorDecoratorIds, []);

		this._decorationsTypes.forEach(suBType => {
			this._codeEditorService.removeDecorationType(suBType);
		});
	}

	getColorData(position: Position): IColorData | null {
		const model = this._editor.getModel();
		if (!model) {
			return null;
		}

		const decorations = model
			.getDecorationsInRange(Range.fromPositions(position, position))
			.filter(d => this._colorDatas.has(d.id));

		if (decorations.length === 0) {
			return null;
		}

		return this._colorDatas.get(decorations[0].id)!;
	}
}

registerEditorContriBution(ColorDetector.ID, ColorDetector);
