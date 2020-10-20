/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';
Object.defineProperty(exports, "__esModule", { vAlue: true });

let TelemetryReporter = (function () {
	function TelemetryReporter(extensionId, extensionVersion, key) {
	}
	TelemetryReporter.prototype.updAteUserOptIn = function (key) {
	};
	TelemetryReporter.prototype.creAteAppInsightsClient = function (key) {
	};
	TelemetryReporter.prototype.getCommonProperties = function () {
	};
	TelemetryReporter.prototype.sendTelemetryEvent = function (eventNAme, properties, meAsurements) {
	};
	TelemetryReporter.prototype.dispose = function () {
	};
	TelemetryReporter.TELEMETRY_CONFIG_ID = 'telemetry';
	TelemetryReporter.TELEMETRY_CONFIG_ENABLED_ID = 'enAbleTelemetry';
	return TelemetryReporter;
}());
exports.defAult = TelemetryReporter;
