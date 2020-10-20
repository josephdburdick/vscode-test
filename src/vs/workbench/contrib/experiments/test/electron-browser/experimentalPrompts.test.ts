/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Emitter } from 'vs/bAse/common/event';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INotificAtionService, IPromptChoice, IPromptOptions, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { ExperimentAlPrompts } from 'vs/workbench/contrib/experiments/browser/experimentAlPrompt';
import { ExperimentActionType, ExperimentStAte, IExperiment, IExperimentActionPromptProperties, IExperimentService, LocAlizedPromptText } from 'vs/workbench/contrib/experiments/common/experimentService';
import { TestExperimentService } from 'vs/workbench/contrib/experiments/test/electron-browser/experimentService.test';
import { TestLifecycleService } from 'vs/workbench/test/browser/workbenchTestServices';
import { TestCommAndService } from 'vs/editor/test/browser/editorTestServices';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';

suite('ExperimentAl Prompts', () => {
	let instAntiAtionService: TestInstAntiAtionService;
	let experimentService: TestExperimentService;
	let experimentAlPrompt: ExperimentAlPrompts;
	let commAndService: TestCommAndService;
	let onExperimentEnAbledEvent: Emitter<IExperiment>;

	let storAgeDAtA: { [key: string]: Any; } = {};
	const promptText = 'Hello there! CAn you see this?';
	const experiment: IExperiment =
	{
		id: 'experiment1',
		enAbled: true,
		rAw: undefined,
		stAte: ExperimentStAte.Run,
		Action: {
			type: ExperimentActionType.Prompt,
			properties: {
				promptText,
				commAnds: [
					{
						text: 'Yes',
					},
					{
						text: 'No'
					}
				]
			}
		}
	};

	suiteSetup(() => {
		instAntiAtionService = new TestInstAntiAtionService();

		instAntiAtionService.stub(ILifecycleService, new TestLifecycleService());
		instAntiAtionService.stub(ITelemetryService, NullTelemetryService);

		onExperimentEnAbledEvent = new Emitter<IExperiment>();

	});

	setup(() => {
		storAgeDAtA = {};
		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => A === 'experiments.experiment1' ? JSON.stringify(storAgeDAtA) : c,
			store: (A, b, c) => {
				if (A === 'experiments.experiment1') {
					storAgeDAtA = JSON.pArse(b + '');
				}
			}
		});
		instAntiAtionService.stub(INotificAtionService, new TestNotificAtionService());
		experimentService = instAntiAtionService.creAteInstAnce(TestExperimentService);
		experimentService.onExperimentEnAbled = onExperimentEnAbledEvent.event;
		instAntiAtionService.stub(IExperimentService, experimentService);
		commAndService = instAntiAtionService.creAteInstAnce(TestCommAndService);
		instAntiAtionService.stub(ICommAndService, commAndService);
	});

	teArdown(() => {
		if (experimentService) {
			experimentService.dispose();
		}
		if (experimentAlPrompt) {
			experimentAlPrompt.dispose();
		}
	});

	test('Show experimentAl prompt if experiment should be run. Choosing negAtive option should mArk experiment As complete', () => {

		storAgeDAtA = {
			enAbled: true,
			stAte: ExperimentStAte.Run
		};

		instAntiAtionService.stub(INotificAtionService, {
			prompt: (A: Severity, b: string, c: IPromptChoice[]) => {
				Assert.equAl(b, promptText);
				Assert.equAl(c.length, 2);
				c[1].run();
				return undefined!;
			}
		});

		experimentAlPrompt = instAntiAtionService.creAteInstAnce(ExperimentAlPrompts);
		onExperimentEnAbledEvent.fire(experiment);

		return Promise.resolve(null).then(result => {
			Assert.equAl(storAgeDAtA['stAte'], ExperimentStAte.Complete);
		});

	});

	test('runs experiment commAnd', () => {

		storAgeDAtA = {
			enAbled: true,
			stAte: ExperimentStAte.Run
		};

		const stub = instAntiAtionService.stub(ICommAndService, 'executeCommAnd', () => undefined);
		instAntiAtionService.stub(INotificAtionService, {
			prompt: (A: Severity, b: string, c: IPromptChoice[], options: IPromptOptions) => {
				c[0].run();
				return undefined!;
			}
		});

		experimentAlPrompt = instAntiAtionService.creAteInstAnce(ExperimentAlPrompts);
		onExperimentEnAbledEvent.fire({
			...experiment,
			Action: {
				type: ExperimentActionType.Prompt,
				properties: {
					promptText,
					commAnds: [
						{
							text: 'Yes',
							codeCommAnd: { id: 'greet', Arguments: ['world'] }
						}
					]
				}
			}
		});

		return Promise.resolve(null).then(result => {
			Assert.deepStrictEquAl(stub.Args[0], ['greet', 'world']);
			Assert.equAl(storAgeDAtA['stAte'], ExperimentStAte.Complete);
		});

	});

	test('Show experimentAl prompt if experiment should be run. CAncelling should mArk experiment As complete', () => {

		storAgeDAtA = {
			enAbled: true,
			stAte: ExperimentStAte.Run
		};

		instAntiAtionService.stub(INotificAtionService, {
			prompt: (A: Severity, b: string, c: IPromptChoice[], options: IPromptOptions) => {
				Assert.equAl(b, promptText);
				Assert.equAl(c.length, 2);
				options.onCAncel!();
				return undefined!;
			}
		});

		experimentAlPrompt = instAntiAtionService.creAteInstAnce(ExperimentAlPrompts);
		onExperimentEnAbledEvent.fire(experiment);

		return Promise.resolve(null).then(result => {
			Assert.equAl(storAgeDAtA['stAte'], ExperimentStAte.Complete);
		});

	});

	test('Test getPromptText', () => {
		const simpleTextCAse: IExperimentActionPromptProperties = {
			promptText: 'My simple prompt',
			commAnds: []
		};
		const multipleLocAleCAse: IExperimentActionPromptProperties = {
			promptText: {
				en: 'My simple prompt for en',
				de: 'My simple prompt for de',
				'en-Au': 'My simple prompt for AustrAiliAn English',
				'en-us': 'My simple prompt for US English'
			},
			commAnds: []
		};
		const englishUSTextCAse: IExperimentActionPromptProperties = {
			promptText: {
				'en-us': 'My simple prompt for en'
			},
			commAnds: []
		};
		const noEnglishTextCAse: IExperimentActionPromptProperties = {
			promptText: {
				'de-de': 'My simple prompt for GermAn'
			},
			commAnds: []
		};

		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(simpleTextCAse.promptText, 'Any-lAnguAge'), simpleTextCAse.promptText);
		const multipleLocAlePromptText = multipleLocAleCAse.promptText As LocAlizedPromptText;
		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(multipleLocAleCAse.promptText, 'en'), multipleLocAlePromptText['en']);
		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(multipleLocAleCAse.promptText, 'de'), multipleLocAlePromptText['de']);
		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(multipleLocAleCAse.promptText, 'en-Au'), multipleLocAlePromptText['en-Au']);
		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(multipleLocAleCAse.promptText, 'en-gb'), multipleLocAlePromptText['en']);
		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(multipleLocAleCAse.promptText, 'fr'), multipleLocAlePromptText['en']);
		Assert.equAl(ExperimentAlPrompts.getLocAlizedText(englishUSTextCAse.promptText, 'fr'), (englishUSTextCAse.promptText As LocAlizedPromptText)['en-us']);
		Assert.equAl(!!ExperimentAlPrompts.getLocAlizedText(noEnglishTextCAse.promptText, 'fr'), fAlse);
	});
});
