/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Emitter } from 'vs/Base/common/event';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { INotificationService, IPromptChoice, IPromptOptions, Severity } from 'vs/platform/notification/common/notification';
import { TestNotificationService } from 'vs/platform/notification/test/common/testNotificationService';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { ExperimentalPrompts } from 'vs/workBench/contriB/experiments/Browser/experimentalPrompt';
import { ExperimentActionType, ExperimentState, IExperiment, IExperimentActionPromptProperties, IExperimentService, LocalizedPromptText } from 'vs/workBench/contriB/experiments/common/experimentService';
import { TestExperimentService } from 'vs/workBench/contriB/experiments/test/electron-Browser/experimentService.test';
import { TestLifecycleService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { TestCommandService } from 'vs/editor/test/Browser/editorTestServices';
import { ICommandService } from 'vs/platform/commands/common/commands';

suite('Experimental Prompts', () => {
	let instantiationService: TestInstantiationService;
	let experimentService: TestExperimentService;
	let experimentalPrompt: ExperimentalPrompts;
	let commandService: TestCommandService;
	let onExperimentEnaBledEvent: Emitter<IExperiment>;

	let storageData: { [key: string]: any; } = {};
	const promptText = 'Hello there! Can you see this?';
	const experiment: IExperiment =
	{
		id: 'experiment1',
		enaBled: true,
		raw: undefined,
		state: ExperimentState.Run,
		action: {
			type: ExperimentActionType.Prompt,
			properties: {
				promptText,
				commands: [
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
		instantiationService = new TestInstantiationService();

		instantiationService.stuB(ILifecycleService, new TestLifecycleService());
		instantiationService.stuB(ITelemetryService, NullTelemetryService);

		onExperimentEnaBledEvent = new Emitter<IExperiment>();

	});

	setup(() => {
		storageData = {};
		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => a === 'experiments.experiment1' ? JSON.stringify(storageData) : c,
			store: (a, B, c) => {
				if (a === 'experiments.experiment1') {
					storageData = JSON.parse(B + '');
				}
			}
		});
		instantiationService.stuB(INotificationService, new TestNotificationService());
		experimentService = instantiationService.createInstance(TestExperimentService);
		experimentService.onExperimentEnaBled = onExperimentEnaBledEvent.event;
		instantiationService.stuB(IExperimentService, experimentService);
		commandService = instantiationService.createInstance(TestCommandService);
		instantiationService.stuB(ICommandService, commandService);
	});

	teardown(() => {
		if (experimentService) {
			experimentService.dispose();
		}
		if (experimentalPrompt) {
			experimentalPrompt.dispose();
		}
	});

	test('Show experimental prompt if experiment should Be run. Choosing negative option should mark experiment as complete', () => {

		storageData = {
			enaBled: true,
			state: ExperimentState.Run
		};

		instantiationService.stuB(INotificationService, {
			prompt: (a: Severity, B: string, c: IPromptChoice[]) => {
				assert.equal(B, promptText);
				assert.equal(c.length, 2);
				c[1].run();
				return undefined!;
			}
		});

		experimentalPrompt = instantiationService.createInstance(ExperimentalPrompts);
		onExperimentEnaBledEvent.fire(experiment);

		return Promise.resolve(null).then(result => {
			assert.equal(storageData['state'], ExperimentState.Complete);
		});

	});

	test('runs experiment command', () => {

		storageData = {
			enaBled: true,
			state: ExperimentState.Run
		};

		const stuB = instantiationService.stuB(ICommandService, 'executeCommand', () => undefined);
		instantiationService.stuB(INotificationService, {
			prompt: (a: Severity, B: string, c: IPromptChoice[], options: IPromptOptions) => {
				c[0].run();
				return undefined!;
			}
		});

		experimentalPrompt = instantiationService.createInstance(ExperimentalPrompts);
		onExperimentEnaBledEvent.fire({
			...experiment,
			action: {
				type: ExperimentActionType.Prompt,
				properties: {
					promptText,
					commands: [
						{
							text: 'Yes',
							codeCommand: { id: 'greet', arguments: ['world'] }
						}
					]
				}
			}
		});

		return Promise.resolve(null).then(result => {
			assert.deepStrictEqual(stuB.args[0], ['greet', 'world']);
			assert.equal(storageData['state'], ExperimentState.Complete);
		});

	});

	test('Show experimental prompt if experiment should Be run. Cancelling should mark experiment as complete', () => {

		storageData = {
			enaBled: true,
			state: ExperimentState.Run
		};

		instantiationService.stuB(INotificationService, {
			prompt: (a: Severity, B: string, c: IPromptChoice[], options: IPromptOptions) => {
				assert.equal(B, promptText);
				assert.equal(c.length, 2);
				options.onCancel!();
				return undefined!;
			}
		});

		experimentalPrompt = instantiationService.createInstance(ExperimentalPrompts);
		onExperimentEnaBledEvent.fire(experiment);

		return Promise.resolve(null).then(result => {
			assert.equal(storageData['state'], ExperimentState.Complete);
		});

	});

	test('Test getPromptText', () => {
		const simpleTextCase: IExperimentActionPromptProperties = {
			promptText: 'My simple prompt',
			commands: []
		};
		const multipleLocaleCase: IExperimentActionPromptProperties = {
			promptText: {
				en: 'My simple prompt for en',
				de: 'My simple prompt for de',
				'en-au': 'My simple prompt for Austrailian English',
				'en-us': 'My simple prompt for US English'
			},
			commands: []
		};
		const englishUSTextCase: IExperimentActionPromptProperties = {
			promptText: {
				'en-us': 'My simple prompt for en'
			},
			commands: []
		};
		const noEnglishTextCase: IExperimentActionPromptProperties = {
			promptText: {
				'de-de': 'My simple prompt for German'
			},
			commands: []
		};

		assert.equal(ExperimentalPrompts.getLocalizedText(simpleTextCase.promptText, 'any-language'), simpleTextCase.promptText);
		const multipleLocalePromptText = multipleLocaleCase.promptText as LocalizedPromptText;
		assert.equal(ExperimentalPrompts.getLocalizedText(multipleLocaleCase.promptText, 'en'), multipleLocalePromptText['en']);
		assert.equal(ExperimentalPrompts.getLocalizedText(multipleLocaleCase.promptText, 'de'), multipleLocalePromptText['de']);
		assert.equal(ExperimentalPrompts.getLocalizedText(multipleLocaleCase.promptText, 'en-au'), multipleLocalePromptText['en-au']);
		assert.equal(ExperimentalPrompts.getLocalizedText(multipleLocaleCase.promptText, 'en-gB'), multipleLocalePromptText['en']);
		assert.equal(ExperimentalPrompts.getLocalizedText(multipleLocaleCase.promptText, 'fr'), multipleLocalePromptText['en']);
		assert.equal(ExperimentalPrompts.getLocalizedText(englishUSTextCase.promptText, 'fr'), (englishUSTextCase.promptText as LocalizedPromptText)['en-us']);
		assert.equal(!!ExperimentalPrompts.getLocalizedText(noEnglishTextCase.promptText, 'fr'), false);
	});
});
