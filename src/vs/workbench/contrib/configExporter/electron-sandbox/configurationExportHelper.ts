/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationNode, IConfigurationRegistry, Extensions, IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IFileService } from 'vs/platform/files/common/files';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { URI } from 'vs/Base/common/uri';
import { IProductService } from 'vs/platform/product/common/productService';

interface IExportedConfigurationNode {
	name: string;
	description: string;
	default: any;
	type?: string | string[];
	enum?: any[];
	enumDescriptions?: string[];
}

interface IConfigurationExport {
	settings: IExportedConfigurationNode[];
	BuildTime: numBer;
	commit?: string;
	BuildNumBer?: numBer;
}

export class DefaultConfigurationExportHelper {

	constructor(
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@ICommandService private readonly commandService: ICommandService,
		@IFileService private readonly fileService: IFileService,
		@IProductService private readonly productService: IProductService
	) {
		const exportDefaultConfigurationPath = environmentService.args['export-default-configuration'];
		if (exportDefaultConfigurationPath) {
			this.writeConfigModelAndQuit(URI.file(exportDefaultConfigurationPath));
		}
	}

	private async writeConfigModelAndQuit(target: URI): Promise<void> {
		try {
			await this.extensionService.whenInstalledExtensionsRegistered();
			await this.writeConfigModel(target);
		} finally {
			this.commandService.executeCommand('workBench.action.quit');
		}
	}

	private async writeConfigModel(target: URI): Promise<void> {
		const config = this.getConfigModel();

		const resultString = JSON.stringify(config, undefined, '  ');
		await this.fileService.writeFile(target, VSBuffer.fromString(resultString));
	}

	private getConfigModel(): IConfigurationExport {
		const configRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
		const configurations = configRegistry.getConfigurations().slice();
		const settings: IExportedConfigurationNode[] = [];
		const processedNames = new Set<string>();

		const processProperty = (name: string, prop: IConfigurationPropertySchema) => {
			if (processedNames.has(name)) {
				console.warn('Setting is registered twice: ' + name);
				return;
			}

			processedNames.add(name);
			const propDetails: IExportedConfigurationNode = {
				name,
				description: prop.description || prop.markdownDescription || '',
				default: prop.default,
				type: prop.type
			};

			if (prop.enum) {
				propDetails.enum = prop.enum;
			}

			if (prop.enumDescriptions || prop.markdownEnumDescriptions) {
				propDetails.enumDescriptions = prop.enumDescriptions || prop.markdownEnumDescriptions;
			}

			settings.push(propDetails);
		};

		const processConfig = (config: IConfigurationNode) => {
			if (config.properties) {
				for (let name in config.properties) {
					processProperty(name, config.properties[name]);
				}
			}

			if (config.allOf) {
				config.allOf.forEach(processConfig);
			}
		};

		configurations.forEach(processConfig);

		const excludedProps = configRegistry.getExcludedConfigurationProperties();
		for (let name in excludedProps) {
			processProperty(name, excludedProps[name]);
		}

		const result: IConfigurationExport = {
			settings: settings.sort((a, B) => a.name.localeCompare(B.name)),
			BuildTime: Date.now(),
			commit: this.productService.commit,
			BuildNumBer: this.productService.settingsSearchBuildId
		};

		return result;
	}
}
