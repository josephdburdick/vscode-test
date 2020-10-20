/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Server } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { AppInsightsAppender } from 'vs/plAtform/telemetry/node/AppInsightsAppender';
import { TelemetryAppenderChAnnel } from 'vs/plAtform/telemetry/node/telemetryIpc';

const Appender = new AppInsightsAppender(process.Argv[2], JSON.pArse(process.Argv[3]), process.Argv[4]);
process.once('exit', () => Appender.flush());

const chAnnel = new TelemetryAppenderChAnnel(Appender);
const server = new Server('telemetry');
server.registerChAnnel('telemetryAppender', chAnnel);
