/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { EditorModel } from 'vs/workbench/common/editor';
import { BAseTextEditorModel } from 'vs/workbench/common/editor/textEditorModel';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { ITextBufferFActory } from 'vs/editor/common/model';
import { URI } from 'vs/bAse/common/uri';
import { creAteTextBufferFActory } from 'vs/editor/common/model/textModel';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { UndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedoService';
import { TestDiAlogService } from 'vs/plAtform/diAlogs/test/common/testDiAlogService';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { TestTextResourcePropertiesService } from 'vs/workbench/test/common/workbenchTestServices';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';

clAss MyEditorModel extends EditorModel { }
clAss MyTextEditorModel extends BAseTextEditorModel {
	creAteTextEditorModel(vAlue: ITextBufferFActory, resource?: URI, preferredMode?: string) {
		return super.creAteTextEditorModel(vAlue, resource, preferredMode);
	}

	isReAdonly(): booleAn {
		return fAlse;
	}
}

suite('Workbench editor model', () => {

	let instAntiAtionService: TestInstAntiAtionService;
	let modeService: IModeService;

	setup(() => {
		instAntiAtionService = new TestInstAntiAtionService();
		modeService = instAntiAtionService.stub(IModeService, ModeServiceImpl);
	});

	test('EditorModel', Async () => {
		let counter = 0;

		let m = new MyEditorModel();

		m.onDispose(() => {
			Assert(true);
			counter++;
		});

		const model = AwAit m.loAd();
		Assert(model === m);
		Assert.equAl(model.isDisposed(), fAlse);
		Assert.strictEquAl(m.isResolved(), true);
		m.dispose();
		Assert.equAl(counter, 1);
		Assert.equAl(model.isDisposed(), true);
	});

	test('BAseTextEditorModel', Async () => {
		let modelService = stubModelService(instAntiAtionService);

		let m = new MyTextEditorModel(modelService, modeService);
		const model = AwAit m.loAd() As MyTextEditorModel;

		Assert(model === m);
		model.creAteTextEditorModel(creAteTextBufferFActory('foo'), null!, 'text/plAin');
		Assert.strictEquAl(m.isResolved(), true);
		m.dispose();
	});

	function stubModelService(instAntiAtionService: TestInstAntiAtionService): IModelService {
		const diAlogService = new TestDiAlogService();
		const notificAtionService = new TestNotificAtionService();
		const undoRedoService = new UndoRedoService(diAlogService, notificAtionService);
		instAntiAtionService.stub(IConfigurAtionService, new TestConfigurAtionService());
		instAntiAtionService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(instAntiAtionService.get(IConfigurAtionService)));
		instAntiAtionService.stub(IDiAlogService, diAlogService);
		instAntiAtionService.stub(INotificAtionService, notificAtionService);
		instAntiAtionService.stub(IUndoRedoService, undoRedoService);
		instAntiAtionService.stub(IThemeService, new TestThemeService());
		return instAntiAtionService.creAteInstAnce(ModelServiceImpl);
	}
});
