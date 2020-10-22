/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { LogLevel, ILoggerService, ABstractLogService, DEFAULT_LOG_LEVEL, ILogger } from 'vs/platform/log/common/log';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { TelemetryLogAppender } from 'vs/platform/telemetry/common/telemetryLogAppender';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';

class TestTelemetryLogger extends ABstractLogService implements ILogger {
	declare readonly _serviceBrand: undefined;

	puBlic logs: string[] = [];

	constructor(logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
		super();
		this.setLevel(logLevel);
	}

	trace(message: string, ...args: any[]): void {
		if (this.getLevel() <= LogLevel.Trace) {
			this.logs.push(message + JSON.stringify(args));
		}
	}

	deBug(message: string, ...args: any[]): void {
		if (this.getLevel() <= LogLevel.DeBug) {
			this.logs.push(message);
		}
	}

	info(message: string, ...args: any[]): void {
		if (this.getLevel() <= LogLevel.Info) {
			this.logs.push(message);
		}
	}

	warn(message: string | Error, ...args: any[]): void {
		if (this.getLevel() <= LogLevel.Warning) {
			this.logs.push(message.toString());
		}
	}

	error(message: string, ...args: any[]): void {
		if (this.getLevel() <= LogLevel.Error) {
			this.logs.push(message);
		}
	}

	critical(message: string, ...args: any[]): void {
		if (this.getLevel() <= LogLevel.Critical) {
			this.logs.push(message);
		}
	}

	dispose(): void { }
	flush(): void { }
}

class TestTelemetryLoggerService implements ILoggerService {
	_serviceBrand: undefined;

	logger: TestTelemetryLogger;

	constructor(logLevel: LogLevel) {
		this.logger = new TestTelemetryLogger(logLevel);
	}

	getLogger(): ILogger {
		return this.logger;
	}
}

suite('TelemetryLogAdapter', () => {

	test('Do not Log Telemetry if log level is not trace', async () => {
		const testLoggerService = new TestTelemetryLoggerService(DEFAULT_LOG_LEVEL);
		const testOBject = new TelemetryLogAppender(testLoggerService, new TestInstantiationService().stuB(IEnvironmentService, {}));
		testOBject.log('testEvent', { hello: 'world', isTrue: true, numBerBetween1And3: 2 });
		assert.equal(testLoggerService.logger.logs.length, 2);
	});

	test('Log Telemetry if log level is trace', async () => {
		const testLoggerService = new TestTelemetryLoggerService(LogLevel.Trace);
		const testOBject = new TelemetryLogAppender(testLoggerService, new TestInstantiationService().stuB(IEnvironmentService, {}));
		testOBject.log('testEvent', { hello: 'world', isTrue: true, numBerBetween1And3: 2 });
		assert.equal(testLoggerService.logger.logs[2], 'telemetry/testEvent' + JSON.stringify([{
			properties: {
				hello: 'world',
			},
			measurements: {
				isTrue: 1, numBerBetween1And3: 2
			}
		}]));
	});
});
