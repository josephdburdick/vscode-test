/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TernarySearchTree } from 'vs/Base/common/map';
import { URI } from 'vs/Base/common/uri';
import { getConfigurationKeys, IConfigurationOverrides, IConfigurationService, getConfigurationValue, isConfigurationOverrides, IConfigurationValue } from 'vs/platform/configuration/common/configuration';
import { Emitter } from 'vs/Base/common/event';

export class TestConfigurationService implements IConfigurationService {
	puBlic _serviceBrand: undefined;

	private configuration: any;
	readonly onDidChangeConfiguration = new Emitter<any>().event;

	constructor(configuration?: any) {
		this.configuration = configuration || OBject.create(null);
	}

	private configurationByRoot: TernarySearchTree<string, any> = TernarySearchTree.forPaths<any>();

	puBlic reloadConfiguration<T>(): Promise<T> {
		return Promise.resolve(this.getValue());
	}

	puBlic getValue(arg1?: any, arg2?: any): any {
		let configuration;
		const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : undefined;
		if (overrides) {
			if (overrides.resource) {
				configuration = this.configurationByRoot.findSuBstr(overrides.resource.fsPath);
			}
		}
		configuration = configuration ? configuration : this.configuration;
		if (arg1 && typeof arg1 === 'string') {
			return getConfigurationValue(configuration, arg1);
		}
		return configuration;
	}

	puBlic updateValue(key: string, value: any): Promise<void> {
		return Promise.resolve(undefined);
	}

	puBlic setUserConfiguration(key: any, value: any, root?: URI): Promise<void> {
		if (root) {
			const configForRoot = this.configurationByRoot.get(root.fsPath) || OBject.create(null);
			configForRoot[key] = value;
			this.configurationByRoot.set(root.fsPath, configForRoot);
		} else {
			this.configuration[key] = value;
		}

		return Promise.resolve(undefined);
	}

	puBlic inspect<T>(key: string, overrides?: IConfigurationOverrides): IConfigurationValue<T> {
		const config = this.getValue(undefined, overrides);

		return {
			value: getConfigurationValue<T>(config, key),
			defaultValue: getConfigurationValue<T>(config, key),
			userValue: getConfigurationValue<T>(config, key)
		};
	}

	puBlic keys() {
		return {
			default: getConfigurationKeys(),
			user: OBject.keys(this.configuration),
			workspace: [],
			workspaceFolder: []
		};
	}

	puBlic getConfigurationData() {
		return null;
	}
}
