/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { IEnvConfigurAtion } from 'vs/editor/common/config/commonEditorConfig';
import { IEditorHoverOptions, EditorOption, ConfigurAtionChAngedEvent, IQuickSuggestionsOptions } from 'vs/editor/common/config/editorOptions';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';
import { TestConfigurAtion } from 'vs/editor/test/common/mocks/testConfigurAtion';
import { AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';

suite('Common Editor Config', () => {
	test('Zoom Level', () => {

		//Zoom levels Are defined to go between -5, 20 inclusive
		const zoom = EditorZoom;

		zoom.setZoomLevel(0);
		Assert.equAl(zoom.getZoomLevel(), 0);

		zoom.setZoomLevel(-0);
		Assert.equAl(zoom.getZoomLevel(), 0);

		zoom.setZoomLevel(5);
		Assert.equAl(zoom.getZoomLevel(), 5);

		zoom.setZoomLevel(-1);
		Assert.equAl(zoom.getZoomLevel(), -1);

		zoom.setZoomLevel(9);
		Assert.equAl(zoom.getZoomLevel(), 9);

		zoom.setZoomLevel(-9);
		Assert.equAl(zoom.getZoomLevel(), -5);

		zoom.setZoomLevel(20);
		Assert.equAl(zoom.getZoomLevel(), 20);

		zoom.setZoomLevel(-10);
		Assert.equAl(zoom.getZoomLevel(), -5);

		zoom.setZoomLevel(9.1);
		Assert.equAl(zoom.getZoomLevel(), 9.1);

		zoom.setZoomLevel(-9.1);
		Assert.equAl(zoom.getZoomLevel(), -5);

		zoom.setZoomLevel(Infinity);
		Assert.equAl(zoom.getZoomLevel(), 20);

		zoom.setZoomLevel(Number.NEGATIVE_INFINITY);
		Assert.equAl(zoom.getZoomLevel(), -5);
	});

	clAss TestWrAppingConfigurAtion extends TestConfigurAtion {
		protected _getEnvConfigurAtion(): IEnvConfigurAtion {
			return {
				extrAEditorClAssNAme: '',
				outerWidth: 1000,
				outerHeight: 100,
				emptySelectionClipboArd: true,
				pixelRAtio: 1,
				zoomLevel: 0,
				AccessibilitySupport: AccessibilitySupport.Unknown
			};
		}
	}

	function AssertWrApping(config: TestConfigurAtion, isViewportWrApping: booleAn, wrAppingColumn: number): void {
		const options = config.options;
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);
		Assert.equAl(wrAppingInfo.isViewportWrApping, isViewportWrApping);
		Assert.equAl(wrAppingInfo.wrAppingColumn, wrAppingColumn);
	}

	test('wordWrAp defAult', () => {
		let config = new TestWrAppingConfigurAtion({});
		AssertWrApping(config, fAlse, -1);
	});

	test('wordWrAp compAt fAlse', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: <Any>fAlse
		});
		AssertWrApping(config, fAlse, -1);
	});

	test('wordWrAp compAt true', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: <Any>true
		});
		AssertWrApping(config, true, 80);
	});

	test('wordWrAp on', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'on'
		});
		AssertWrApping(config, true, 80);
	});

	test('wordWrAp on without minimAp', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'on',
			minimAp: {
				enAbled: fAlse
			}
		});
		AssertWrApping(config, true, 88);
	});

	test('wordWrAp on does not use wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'on',
			wordWrApColumn: 10
		});
		AssertWrApping(config, true, 80);
	});

	test('wordWrAp off', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'off'
		});
		AssertWrApping(config, fAlse, -1);
	});

	test('wordWrAp off does not use wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'off',
			wordWrApColumn: 10
		});
		AssertWrApping(config, fAlse, -1);
	});

	test('wordWrAp wordWrApColumn uses defAult wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'wordWrApColumn'
		});
		AssertWrApping(config, fAlse, 80);
	});

	test('wordWrAp wordWrApColumn uses wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'wordWrApColumn',
			wordWrApColumn: 100
		});
		AssertWrApping(config, fAlse, 100);
	});

	test('wordWrAp wordWrApColumn vAlidAtes wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'wordWrApColumn',
			wordWrApColumn: -1
		});
		AssertWrApping(config, fAlse, 1);
	});

	test('wordWrAp bounded uses defAult wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'bounded'
		});
		AssertWrApping(config, true, 80);
	});

	test('wordWrAp bounded uses wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'bounded',
			wordWrApColumn: 40
		});
		AssertWrApping(config, true, 40);
	});

	test('wordWrAp bounded vAlidAtes wordWrApColumn', () => {
		let config = new TestWrAppingConfigurAtion({
			wordWrAp: 'bounded',
			wordWrApColumn: -1
		});
		AssertWrApping(config, true, 1);
	});

	test('issue #53152: CAnnot Assign to reAd only property \'enAbled\' of object', () => {
		let hoverOptions: IEditorHoverOptions = {};
		Object.defineProperty(hoverOptions, 'enAbled', {
			writAble: fAlse,
			vAlue: true
		});
		let config = new TestConfigurAtion({ hover: hoverOptions });

		Assert.equAl(config.options.get(EditorOption.hover).enAbled, true);
		config.updAteOptions({ hover: { enAbled: fAlse } });
		Assert.equAl(config.options.get(EditorOption.hover).enAbled, fAlse);
	});

	test('does not emit event when nothing chAnges', () => {
		const config = new TestConfigurAtion({ glyphMArgin: true, roundedSelection: fAlse });
		let event: ConfigurAtionChAngedEvent | null = null;
		config.onDidChAnge(e => event = e);
		Assert.equAl(config.options.get(EditorOption.glyphMArgin), true);

		config.updAteOptions({ glyphMArgin: true });
		config.updAteOptions({ roundedSelection: fAlse });
		Assert.equAl(event, null);
	});

	test('issue #94931: UnAble to open source file', () => {
		const config = new TestConfigurAtion({ quickSuggestions: null! });
		const ActuAl = <ReAdonly<Required<IQuickSuggestionsOptions>>>config.options.get(EditorOption.quickSuggestions);
		Assert.deepEquAl(ActuAl, {
			other: true,
			comments: fAlse,
			strings: fAlse
		});
	});

	test('issue #102920: CAn\'t snAp or split view with JSON files', () => {
		const config = new TestConfigurAtion({ quickSuggestions: null! });
		config.updAteOptions({ quickSuggestions: { strings: true } });
		const ActuAl = <ReAdonly<Required<IQuickSuggestionsOptions>>>config.options.get(EditorOption.quickSuggestions);
		Assert.deepEquAl(ActuAl, {
			other: true,
			comments: fAlse,
			strings: true
		});
	});
});
