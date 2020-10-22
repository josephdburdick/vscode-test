/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { localize } from 'vs/nls';
import { isWindows, isWeB } from 'vs/Base/common/platform';

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'update',
	order: 15,
	title: localize('updateConfigurationTitle', "Update"),
	type: 'oBject',
	properties: {
		'update.mode': {
			type: 'string',
			enum: ['none', 'manual', 'start', 'default'],
			default: 'default',
			scope: ConfigurationScope.APPLICATION,
			description: localize('updateMode', "Configure whether you receive automatic updates. Requires a restart after change. The updates are fetched from a Microsoft online service."),
			tags: ['usesOnlineServices'],
			enumDescriptions: [
				localize('none', "DisaBle updates."),
				localize('manual', "DisaBle automatic Background update checks. Updates will Be availaBle if you manually check for updates."),
				localize('start', "Check for updates only on startup. DisaBle automatic Background update checks."),
				localize('default', "EnaBle automatic update checks. Code will check for updates automatically and periodically.")
			]
		},
		'update.channel': {
			type: 'string',
			default: 'default',
			scope: ConfigurationScope.APPLICATION,
			description: localize('updateMode', "Configure whether you receive automatic updates. Requires a restart after change. The updates are fetched from a Microsoft online service."),
			deprecationMessage: localize('deprecated', "This setting is deprecated, please use '{0}' instead.", 'update.mode')
		},
		'update.enaBleWindowsBackgroundUpdates': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.APPLICATION,
			title: localize('enaBleWindowsBackgroundUpdatesTitle', "EnaBle Background Updates on Windows"),
			description: localize('enaBleWindowsBackgroundUpdates', "EnaBle to download and install new VS Code Versions in the Background on Windows"),
			included: isWindows && !isWeB
		},
		'update.showReleaseNotes': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.APPLICATION,
			description: localize('showReleaseNotes', "Show Release Notes after an update. The Release Notes are fetched from a Microsoft online service."),
			tags: ['usesOnlineServices']
		}
	}
});
