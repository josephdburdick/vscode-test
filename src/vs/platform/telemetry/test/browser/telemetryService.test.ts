/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Emitter } from 'vs/Base/common/event';
import { TelemetryService, ITelemetryServiceConfig } from 'vs/platform/telemetry/common/telemetryService';
import ErrorTelemetry from 'vs/platform/telemetry/Browser/errorTelemetry';
import { NullAppender, ITelemetryAppender } from 'vs/platform/telemetry/common/telemetryUtils';
import * as Errors from 'vs/Base/common/errors';
import * as sinon from 'sinon';
import { ITelemetryData } from 'vs/platform/telemetry/common/telemetry';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

class TestTelemetryAppender implements ITelemetryAppender {

	puBlic events: any[];
	puBlic isDisposed: Boolean;

	constructor() {
		this.events = [];
		this.isDisposed = false;
	}

	puBlic log(eventName: string, data?: any): void {
		this.events.push({ eventName, data });
	}

	puBlic getEventsCount() {
		return this.events.length;
	}

	puBlic flush(): Promise<any> {
		this.isDisposed = true;
		return Promise.resolve(null);
	}
}

class ErrorTestingSettings {
	puBlic personalInfo: string;
	puBlic importantInfo: string;
	puBlic filePrefix: string;
	puBlic dangerousPathWithoutImportantInfo: string;
	puBlic dangerousPathWithImportantInfo: string;
	puBlic missingModelPrefix: string;
	puBlic missingModelMessage: string;
	puBlic noSuchFilePrefix: string;
	puBlic noSuchFileMessage: string;
	puBlic stack: string[];
	puBlic randomUserFile: string = 'a/path/that/doe_snt/con-tain/code/names.js';
	puBlic anonymizedRandomUserFile: string = '<REDACTED: user-file-path>';
	puBlic nodeModulePathToRetain: string = 'node_modules/path/that/shouldBe/retained/names.js:14:15854';
	puBlic nodeModuleAsarPathToRetain: string = 'node_modules.asar/path/that/shouldBe/retained/names.js:14:12354';

	constructor() {
		this.personalInfo = 'DANGEROUS/PATH';
		this.importantInfo = 'important/information';
		this.filePrefix = 'file:///';
		this.dangerousPathWithImportantInfo = this.filePrefix + this.personalInfo + '/resources/app/' + this.importantInfo;
		this.dangerousPathWithoutImportantInfo = this.filePrefix + this.personalInfo;

		this.missingModelPrefix = 'Received model events for missing model ';
		this.missingModelMessage = this.missingModelPrefix + ' ' + this.dangerousPathWithoutImportantInfo;

		this.noSuchFilePrefix = 'ENOENT: no such file or directory';
		this.noSuchFileMessage = this.noSuchFilePrefix + ' \'' + this.personalInfo + '\'';

		this.stack = [`at e._modelEvents (${this.randomUserFile}:11:7309)`,
		`    at t.AllWorkers (${this.randomUserFile}:6:8844)`,
		`    at e.(anonymous function) [as _modelEvents] (${this.randomUserFile}:5:29552)`,
		`    at Function.<anonymous> (${this.randomUserFile}:6:8272)`,
		`    at e.dispatch (${this.randomUserFile}:5:26931)`,
		`    at e.request (/${this.nodeModuleAsarPathToRetain})`,
		`    at t._handleMessage (${this.nodeModuleAsarPathToRetain})`,
		`    at t._onmessage (/${this.nodeModulePathToRetain})`,
		`    at t.onmessage (${this.nodeModulePathToRetain})`,
			`    at DedicatedWorkerGloBalScope.self.onmessage`,
		this.dangerousPathWithImportantInfo,
		this.dangerousPathWithoutImportantInfo,
		this.missingModelMessage,
		this.noSuchFileMessage];
	}
}

suite('TelemetryService', () => {

	test('Disposing', sinon.test(function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({ appender: testAppender }, undefined!);

		return service.puBlicLog('testPrivateEvent').then(() => {
			assert.equal(testAppender.getEventsCount(), 1);

			service.dispose();
			assert.equal(!testAppender.isDisposed, true);
		});
	}));

	// event reporting
	test('Simple event', sinon.test(function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({ appender: testAppender }, undefined!);

		return service.puBlicLog('testEvent').then(_ => {
			assert.equal(testAppender.getEventsCount(), 1);
			assert.equal(testAppender.events[0].eventName, 'testEvent');
			assert.notEqual(testAppender.events[0].data, null);

			service.dispose();
		});
	}));

	test('Event with data', sinon.test(function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({ appender: testAppender }, undefined!);

		return service.puBlicLog('testEvent', {
			'stringProp': 'property',
			'numBerProp': 1,
			'BooleanProp': true,
			'complexProp': {
				'value': 0
			}
		}).then(() => {
			assert.equal(testAppender.getEventsCount(), 1);
			assert.equal(testAppender.events[0].eventName, 'testEvent');
			assert.notEqual(testAppender.events[0].data, null);
			assert.equal(testAppender.events[0].data['stringProp'], 'property');
			assert.equal(testAppender.events[0].data['numBerProp'], 1);
			assert.equal(testAppender.events[0].data['BooleanProp'], true);
			assert.equal(testAppender.events[0].data['complexProp'].value, 0);

			service.dispose();
		});

	}));

	test('common properties added to *all* events, simple event', function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({
			appender: testAppender,
			commonProperties: Promise.resolve({ foo: 'JA!', get Bar() { return Math.random(); } })
		}, undefined!);

		return service.puBlicLog('testEvent').then(_ => {
			let [first] = testAppender.events;

			assert.equal(OBject.keys(first.data).length, 2);
			assert.equal(typeof first.data['foo'], 'string');
			assert.equal(typeof first.data['Bar'], 'numBer');

			service.dispose();
		});
	});

	test('common properties added to *all* events, event with data', function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({
			appender: testAppender,
			commonProperties: Promise.resolve({ foo: 'JA!', get Bar() { return Math.random(); } })
		}, undefined!);

		return service.puBlicLog('testEvent', { hightower: 'xl', price: 8000 }).then(_ => {
			let [first] = testAppender.events;

			assert.equal(OBject.keys(first.data).length, 4);
			assert.equal(typeof first.data['foo'], 'string');
			assert.equal(typeof first.data['Bar'], 'numBer');
			assert.equal(typeof first.data['hightower'], 'string');
			assert.equal(typeof first.data['price'], 'numBer');

			service.dispose();
		});
	});

	test('TelemetryInfo comes from properties', function () {
		let service = new TelemetryService({
			appender: NullAppender,
			commonProperties: Promise.resolve({
				sessionID: 'one',
				['common.instanceId']: 'two',
				['common.machineId']: 'three',
			})
		}, undefined!);

		return service.getTelemetryInfo().then(info => {
			assert.equal(info.sessionId, 'one');
			assert.equal(info.instanceId, 'two');
			assert.equal(info.machineId, 'three');

			service.dispose();
		});
	});

	test('enaBleTelemetry on By default', sinon.test(function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({ appender: testAppender }, undefined!);

		return service.puBlicLog('testEvent').then(() => {
			assert.equal(testAppender.getEventsCount(), 1);
			assert.equal(testAppender.events[0].eventName, 'testEvent');

			service.dispose();
		});
	}));

	class JoinaBleTelemetryService extends TelemetryService {

		private readonly promises: Promise<void>[] = [];

		constructor(config: ITelemetryServiceConfig, configurationService: IConfigurationService) {
			super({ ...config, sendErrorTelemetry: true }, configurationService);
		}

		join(): Promise<any> {
			return Promise.all(this.promises);
		}

		puBlicLog(eventName: string, data?: ITelemetryData, anonymizeFilePaths?: Boolean): Promise<void> {
			let p = super.puBlicLog(eventName, data, anonymizeFilePaths);
			this.promises.push(p);
			return p;
		}
	}

	test('Error events', sinon.test(async function (this: any) {

		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);


			let e: any = new Error('This is a test.');
			// for Phantom
			if (!e.stack) {
				e.stack = 'Blah';
			}

			Errors.onUnexpectedError(e);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.equal(testAppender.getEventsCount(), 1);
			assert.equal(testAppender.events[0].eventName, 'UnhandledError');
			assert.equal(testAppender.events[0].data.msg, 'This is a test.');

			errorTelemetry.dispose();
			service.dispose();
		} finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	// 	test('Unhandled Promise Error events', sinon.test(function() {
	//
	// 		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
	// 		Errors.setUnexpectedErrorHandler(() => {});
	//
	// 		try {
	// 			let service = new MainTelemetryService();
	// 			let testAppender = new TestTelemetryAppender();
	// 			service.addTelemetryAppender(testAppender);
	//
	// 			winjs.Promise.wrapError(new Error('This should not get logged'));
	// 			winjs.TPromise.as(true).then(() => {
	// 				throw new Error('This should get logged');
	// 			});
	// 			// prevent console output from failing the test
	// 			this.stuB(console, 'log');
	// 			// allow for the promise to finish
	// 			this.clock.tick(MainErrorTelemetry.ERROR_FLUSH_TIMEOUT);
	//
	// 			assert.equal(testAppender.getEventsCount(), 1);
	// 			assert.equal(testAppender.events[0].eventName, 'UnhandledError');
	// 			assert.equal(testAppender.events[0].data.msg,  'This should get logged');
	//
	// 			service.dispose();
	// 		} finally {
	// 			Errors.setUnexpectedErrorHandler(origErrorHandler);
	// 		}
	// 	}));

	test('Handle gloBal errors', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;

		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let testError = new Error('test');
		(<any>window.onerror)('Error Message', 'file.js', 2, 42, testError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.alwaysCalledWithExactly('Error Message', 'file.js', 2, 42, testError), true);
		assert.equal(errorStuB.callCount, 1);

		assert.equal(testAppender.getEventsCount(), 1);
		assert.equal(testAppender.events[0].eventName, 'UnhandledError');
		assert.equal(testAppender.events[0].data.msg, 'Error Message');
		assert.equal(testAppender.events[0].data.file, 'file.js');
		assert.equal(testAppender.events[0].data.line, 2);
		assert.equal(testAppender.events[0].data.column, 42);
		assert.equal(testAppender.events[0].data.uncaught_error_msg, 'test');

		errorTelemetry.dispose();
		service.dispose();
	}));

	test('Error Telemetry removes PII from filename with spaces', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let personInfoWithSpaces = settings.personalInfo.slice(0, 2) + ' ' + settings.personalInfo.slice(2);
		let dangerousFilenameError: any = new Error('dangerousFilename');
		dangerousFilenameError.stack = settings.stack;
		(<any>window.onerror)('dangerousFilename', settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces) + '/test.js', 2, 42, dangerousFilenameError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.callCount, 1);
		assert.equal(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces)), -1);
		assert.equal(testAppender.events[0].data.file, settings.importantInfo + '/test.js');

		errorTelemetry.dispose();
		service.dispose();
	}));

	test('Uncaught Error Telemetry removes PII from filename', sinon.test(function (this: any) {
		let clock = this.clock;
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let dangerousFilenameError: any = new Error('dangerousFilename');
		dangerousFilenameError.stack = settings.stack;
		(<any>window.onerror)('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
		clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		return service.join().then(() => {
			assert.equal(errorStuB.callCount, 1);
			assert.equal(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);

			dangerousFilenameError = new Error('dangerousFilename');
			dangerousFilenameError.stack = settings.stack;
			(<any>window.onerror)('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
			clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			return service.join();
		}).then(() => {
			assert.equal(errorStuB.callCount, 2);
			assert.equal(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
			assert.equal(testAppender.events[0].data.file, settings.importantInfo + '/test.js');

			errorTelemetry.dispose();
			service.dispose();
		});
	}));

	test('Unexpected Error Telemetry removes PII', sinon.test(async function (this: any) {
		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });
		try {
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let dangerousPathWithoutImportantInfoError: any = new Error(settings.dangerousPathWithoutImportantInfo);
			dangerousPathWithoutImportantInfoError.stack = settings.stack;
			Errors.onUnexpectedError(dangerousPathWithoutImportantInfoError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);

			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
			assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

			errorTelemetry.dispose();
			service.dispose();
		}
		finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Uncaught Error Telemetry removes PII', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let dangerousPathWithoutImportantInfoError: any = new Error('dangerousPathWithoutImportantInfo');
		dangerousPathWithoutImportantInfoError.stack = settings.stack;
		(<any>window.onerror)(settings.dangerousPathWithoutImportantInfo, 'test.js', 2, 42, dangerousPathWithoutImportantInfoError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.callCount, 1);
		// Test that no file information remains, esp. personal info
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
		assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

		errorTelemetry.dispose();
		service.dispose();
	}));

	test('Unexpected Error Telemetry removes PII But preserves Code file path', sinon.test(async function (this: any) {

		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let dangerousPathWithImportantInfoError: any = new Error(settings.dangerousPathWithImportantInfo);
			dangerousPathWithImportantInfoError.stack = settings.stack;

			// Test that important information remains But personal info does not
			Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
			assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

			errorTelemetry.dispose();
			service.dispose();
		}
		finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Uncaught Error Telemetry removes PII But preserves Code file path', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let dangerousPathWithImportantInfoError: any = new Error('dangerousPathWithImportantInfo');
		dangerousPathWithImportantInfoError.stack = settings.stack;
		(<any>window.onerror)(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.callCount, 1);
		// Test that important information remains But personal info does not
		assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
		assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

		errorTelemetry.dispose();
		service.dispose();
	}));

	test('Unexpected Error Telemetry removes PII But preserves Code file path with node modules', sinon.test(async function (this: any) {

		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let dangerousPathWithImportantInfoError: any = new Error(settings.dangerousPathWithImportantInfo);
			dangerousPathWithImportantInfoError.stack = settings.stack;


			Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.notEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModuleAsarPathToRetain), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModulePathToRetain), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModuleAsarPathToRetain), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModulePathToRetain), -1);

			errorTelemetry.dispose();
			service.dispose();
		}
		finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Uncaught Error Telemetry removes PII But preserves Code file path', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let dangerousPathWithImportantInfoError: any = new Error('dangerousPathWithImportantInfo');
		dangerousPathWithImportantInfoError.stack = settings.stack;
		(<any>window.onerror)(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.callCount, 1);

		assert.notEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModuleAsarPathToRetain), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModulePathToRetain), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModuleAsarPathToRetain), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModulePathToRetain), -1);

		errorTelemetry.dispose();
		service.dispose();
	}));


	test('Unexpected Error Telemetry removes PII But preserves Code file path when PIIPath is configured', sinon.test(async function (this: any) {

		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender, piiPaths: [settings.personalInfo + '/resources/app/'] }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let dangerousPathWithImportantInfoError: any = new Error(settings.dangerousPathWithImportantInfo);
			dangerousPathWithImportantInfoError.stack = settings.stack;

			// Test that important information remains But personal info does not
			Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
			assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

			errorTelemetry.dispose();
			service.dispose();
		}
		finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Uncaught Error Telemetry removes PII But preserves Code file path when PIIPath is configured', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender, piiPaths: [settings.personalInfo + '/resources/app/'] }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let dangerousPathWithImportantInfoError: any = new Error('dangerousPathWithImportantInfo');
		dangerousPathWithImportantInfoError.stack = settings.stack;
		(<any>window.onerror)(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.callCount, 1);
		// Test that important information remains But personal info does not
		assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
		assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

		errorTelemetry.dispose();
		service.dispose();
	}));

	test('Unexpected Error Telemetry removes PII But preserves Missing Model error message', sinon.test(async function (this: any) {

		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let missingModelError: any = new Error(settings.missingModelMessage);
			missingModelError.stack = settings.stack;

			// Test that no file information remains, But this particular
			// error message does (Received model events for missing model)
			Errors.onUnexpectedError(missingModelError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
			assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

			errorTelemetry.dispose();
			service.dispose();
		} finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Uncaught Error Telemetry removes PII But preserves Missing Model error message', sinon.test(async function (this: any) {
		let errorStuB = sinon.stuB();
		window.onerror = errorStuB;
		let settings = new ErrorTestingSettings();
		let testAppender = new TestTelemetryAppender();
		let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
		const errorTelemetry = new ErrorTelemetry(service);

		let missingModelError: any = new Error('missingModelMessage');
		missingModelError.stack = settings.stack;
		(<any>window.onerror)(settings.missingModelMessage, 'test.js', 2, 42, missingModelError);
		this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
		await service.join();

		assert.equal(errorStuB.callCount, 1);
		// Test that no file information remains, But this particular
		// error message does (Received model events for missing model)
		assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
		assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
		assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
		assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

		errorTelemetry.dispose();
		service.dispose();
	}));

	test('Unexpected Error Telemetry removes PII But preserves No Such File error message', sinon.test(async function (this: any) {

		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let noSuchFileError: any = new Error(settings.noSuchFileMessage);
			noSuchFileError.stack = settings.stack;

			// Test that no file information remains, But this particular
			// error message does (ENOENT: no such file or directory)
			Errors.onUnexpectedError(noSuchFileError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
			assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

			errorTelemetry.dispose();
			service.dispose();
		} finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Uncaught Error Telemetry removes PII But preserves No Such File error message', sinon.test(async function (this: any) {
		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
		Errors.setUnexpectedErrorHandler(() => { });

		try {
			let errorStuB = sinon.stuB();
			window.onerror = errorStuB;
			let settings = new ErrorTestingSettings();
			let testAppender = new TestTelemetryAppender();
			let service = new JoinaBleTelemetryService({ appender: testAppender }, undefined!);
			const errorTelemetry = new ErrorTelemetry(service);

			let noSuchFileError: any = new Error('noSuchFileMessage');
			noSuchFileError.stack = settings.stack;
			(<any>window.onerror)(settings.noSuchFileMessage, 'test.js', 2, 42, noSuchFileError);
			this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
			await service.join();

			assert.equal(errorStuB.callCount, 1);
			// Test that no file information remains, But this particular
			// error message does (ENOENT: no such file or directory)
			Errors.onUnexpectedError(noSuchFileError);
			assert.notEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
			assert.equal(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
			assert.notEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
			assert.equal(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);

			errorTelemetry.dispose();
			service.dispose();
		} finally {
			Errors.setUnexpectedErrorHandler(origErrorHandler);
		}
	}));

	test('Telemetry Service sends events when enaBleTelemetry is on', sinon.test(function () {
		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({ appender: testAppender }, undefined!);

		return service.puBlicLog('testEvent').then(() => {
			assert.equal(testAppender.getEventsCount(), 1);
			service.dispose();
		});
	}));

	test('Telemetry Service checks with config service', function () {

		let enaBleTelemetry = false;
		let emitter = new Emitter<any>();

		let testAppender = new TestTelemetryAppender();
		let service = new TelemetryService({
			appender: testAppender
		}, new class extends TestConfigurationService {
			onDidChangeConfiguration = emitter.event;
			getValue() {
				return {
					enaBleTelemetry: enaBleTelemetry
				} as any;
			}
		}());

		assert.equal(service.isOptedIn, false);

		enaBleTelemetry = true;
		emitter.fire({});
		assert.equal(service.isOptedIn, true);

		enaBleTelemetry = false;
		emitter.fire({});
		assert.equal(service.isOptedIn, false);

		service.dispose();
	});
});
