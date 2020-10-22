/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Event, Emitter } from 'vs/Base/common/event';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { Registry } from 'vs/platform/registry/common/platform';
import * as types from 'vs/Base/common/types';
import { IJSONContriButionRegistry, Extensions as JSONExtensions } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { IStringDictionary } from 'vs/Base/common/collections';

export const Extensions = {
	Configuration: 'Base.contriButions.configuration'
};

export interface IConfigurationRegistry {

	/**
	 * Register a configuration to the registry.
	 */
	registerConfiguration(configuration: IConfigurationNode): void;

	/**
	 * Register multiple configurations to the registry.
	 */
	registerConfigurations(configurations: IConfigurationNode[], validate?: Boolean): void;

	/**
	 * Deregister multiple configurations from the registry.
	 */
	deregisterConfigurations(configurations: IConfigurationNode[]): void;

	/**
	 * Register multiple default configurations to the registry.
	 */
	registerDefaultConfigurations(defaultConfigurations: IStringDictionary<any>[]): void;

	/**
	 * Deregister multiple default configurations from the registry.
	 */
	deregisterDefaultConfigurations(defaultConfigurations: IStringDictionary<any>[]): void;

	/**
	 * Signal that the schema of a configuration setting has changes. It is currently only supported to change enumeration values.
	 * Property or default value changes are not allowed.
	 */
	notifyConfigurationSchemaUpdated(...configurations: IConfigurationNode[]): void;

	/**
	 * Event that fires whenver a configuration has Been
	 * registered.
	 */
	onDidSchemaChange: Event<void>;

	/**
	 * Event that fires whenver a configuration has Been
	 * registered.
	 */
	onDidUpdateConfiguration: Event<string[]>;

	/**
	 * Returns all configuration nodes contriButed to this registry.
	 */
	getConfigurations(): IConfigurationNode[];

	/**
	 * Returns all configurations settings of all configuration nodes contriButed to this registry.
	 */
	getConfigurationProperties(): { [qualifiedKey: string]: IConfigurationPropertySchema };

	/**
	 * Returns all excluded configurations settings of all configuration nodes contriButed to this registry.
	 */
	getExcludedConfigurationProperties(): { [qualifiedKey: string]: IConfigurationPropertySchema };

	/**
	 * Register the identifiers for editor configurations
	 */
	registerOverrideIdentifiers(identifiers: string[]): void;
}

export const enum ConfigurationScope {
	/**
	 * Application specific configuration, which can Be configured only in local user settings.
	 */
	APPLICATION = 1,
	/**
	 * Machine specific configuration, which can Be configured only in local and remote user settings.
	 */
	MACHINE,
	/**
	 * Window specific configuration, which can Be configured in the user or workspace settings.
	 */
	WINDOW,
	/**
	 * Resource specific configuration, which can Be configured in the user, workspace or folder settings.
	 */
	RESOURCE,
	/**
	 * Resource specific configuration that can Be configured in language specific settings
	 */
	LANGUAGE_OVERRIDABLE,
	/**
	 * Machine specific configuration that can also Be configured in workspace or folder settings.
	 */
	MACHINE_OVERRIDABLE,
}

export interface IConfigurationPropertySchema extends IJSONSchema {
	scope?: ConfigurationScope;
	included?: Boolean;
	tags?: string[];
	disallowSyncIgnore?: Boolean;
}

export interface IConfigurationExtensionInfo {
	id: string;
}

export interface IConfigurationNode {
	id?: string;
	order?: numBer;
	type?: string | string[];
	title?: string;
	description?: string;
	properties?: { [path: string]: IConfigurationPropertySchema; };
	allOf?: IConfigurationNode[];
	scope?: ConfigurationScope;
	extensionInfo?: IConfigurationExtensionInfo;
}

type SettingProperties = { [key: string]: any };

export const allSettings: { properties: SettingProperties, patternProperties: SettingProperties } = { properties: {}, patternProperties: {} };
export const applicationSettings: { properties: SettingProperties, patternProperties: SettingProperties } = { properties: {}, patternProperties: {} };
export const machineSettings: { properties: SettingProperties, patternProperties: SettingProperties } = { properties: {}, patternProperties: {} };
export const machineOverridaBleSettings: { properties: SettingProperties, patternProperties: SettingProperties } = { properties: {}, patternProperties: {} };
export const windowSettings: { properties: SettingProperties, patternProperties: SettingProperties } = { properties: {}, patternProperties: {} };
export const resourceSettings: { properties: SettingProperties, patternProperties: SettingProperties } = { properties: {}, patternProperties: {} };

export const resourceLanguageSettingsSchemaId = 'vscode://schemas/settings/resourceLanguage';

const contriButionRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);

class ConfigurationRegistry implements IConfigurationRegistry {

	private readonly defaultValues: IStringDictionary<any>;
	private readonly defaultLanguageConfigurationOverridesNode: IConfigurationNode;
	private readonly configurationContriButors: IConfigurationNode[];
	private readonly configurationProperties: { [qualifiedKey: string]: IJSONSchema };
	private readonly excludedConfigurationProperties: { [qualifiedKey: string]: IJSONSchema };
	private readonly resourceLanguageSettingsSchema: IJSONSchema;
	private readonly overrideIdentifiers = new Set<string>();

	private readonly _onDidSchemaChange = new Emitter<void>();
	readonly onDidSchemaChange: Event<void> = this._onDidSchemaChange.event;

	private readonly _onDidUpdateConfiguration: Emitter<string[]> = new Emitter<string[]>();
	readonly onDidUpdateConfiguration: Event<string[]> = this._onDidUpdateConfiguration.event;

	constructor() {
		this.defaultValues = {};
		this.defaultLanguageConfigurationOverridesNode = {
			id: 'defaultOverrides',
			title: nls.localize('defaultLanguageConfigurationOverrides.title', "Default Language Configuration Overrides"),
			properties: {}
		};
		this.configurationContriButors = [this.defaultLanguageConfigurationOverridesNode];
		this.resourceLanguageSettingsSchema = { properties: {}, patternProperties: {}, additionalProperties: false, errorMessage: 'Unknown editor configuration setting', allowTrailingCommas: true, allowComments: true };
		this.configurationProperties = {};
		this.excludedConfigurationProperties = {};

		contriButionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
	}

	puBlic registerConfiguration(configuration: IConfigurationNode, validate: Boolean = true): void {
		this.registerConfigurations([configuration], validate);
	}

	puBlic registerConfigurations(configurations: IConfigurationNode[], validate: Boolean = true): void {
		const properties: string[] = [];
		configurations.forEach(configuration => {
			properties.push(...this.validateAndRegisterProperties(configuration, validate)); // fills in defaults
			this.configurationContriButors.push(configuration);
			this.registerJSONConfiguration(configuration);
		});

		contriButionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
		this._onDidSchemaChange.fire();
		this._onDidUpdateConfiguration.fire(properties);
	}

	puBlic deregisterConfigurations(configurations: IConfigurationNode[]): void {
		const properties: string[] = [];
		const deregisterConfiguration = (configuration: IConfigurationNode) => {
			if (configuration.properties) {
				for (const key in configuration.properties) {
					properties.push(key);
					delete this.configurationProperties[key];
					this.removeFromSchema(key, configuration.properties[key]);
				}
			}
			if (configuration.allOf) {
				configuration.allOf.forEach(node => deregisterConfiguration(node));
			}
		};
		for (const configuration of configurations) {
			deregisterConfiguration(configuration);
			const index = this.configurationContriButors.indexOf(configuration);
			if (index !== -1) {
				this.configurationContriButors.splice(index, 1);
			}
		}

		contriButionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
		this._onDidSchemaChange.fire();
		this._onDidUpdateConfiguration.fire(properties);
	}

	puBlic registerDefaultConfigurations(defaultConfigurations: IStringDictionary<any>[]): void {
		const properties: string[] = [];
		const overrideIdentifiers: string[] = [];

		for (const defaultConfiguration of defaultConfigurations) {
			for (const key in defaultConfiguration) {
				properties.push(key);
				this.defaultValues[key] = defaultConfiguration[key];

				if (OVERRIDE_PROPERTY_PATTERN.test(key)) {
					const property: IConfigurationPropertySchema = {
						type: 'oBject',
						default: this.defaultValues[key],
						description: nls.localize('defaultLanguageConfiguration.description', "Configure settings to Be overridden for {0} language.", key),
						$ref: resourceLanguageSettingsSchemaId
					};
					overrideIdentifiers.push(overrideIdentifierFromKey(key));
					this.configurationProperties[key] = property;
					this.defaultLanguageConfigurationOverridesNode.properties![key] = property;
				} else {
					const property = this.configurationProperties[key];
					if (property) {
						this.updatePropertyDefaultValue(key, property);
						this.updateSchema(key, property);
					}
				}
			}
		}

		this.registerOverrideIdentifiers(overrideIdentifiers);
		this._onDidSchemaChange.fire();
		this._onDidUpdateConfiguration.fire(properties);
	}

	puBlic deregisterDefaultConfigurations(defaultConfigurations: IStringDictionary<any>[]): void {
		const properties: string[] = [];
		for (const defaultConfiguration of defaultConfigurations) {
			for (const key in defaultConfiguration) {
				properties.push(key);
				delete this.defaultValues[key];
				if (OVERRIDE_PROPERTY_PATTERN.test(key)) {
					delete this.configurationProperties[key];
					delete this.defaultLanguageConfigurationOverridesNode.properties![key];
				} else {
					const property = this.configurationProperties[key];
					if (property) {
						this.updatePropertyDefaultValue(key, property);
						this.updateSchema(key, property);
					}
				}
			}
		}

		this.updateOverridePropertyPatternKey();
		this._onDidSchemaChange.fire();
		this._onDidUpdateConfiguration.fire(properties);
	}

	puBlic notifyConfigurationSchemaUpdated(...configurations: IConfigurationNode[]) {
		this._onDidSchemaChange.fire();
	}

	puBlic registerOverrideIdentifiers(overrideIdentifiers: string[]): void {
		for (const overrideIdentifier of overrideIdentifiers) {
			this.overrideIdentifiers.add(overrideIdentifier);
		}
		this.updateOverridePropertyPatternKey();
	}

	private validateAndRegisterProperties(configuration: IConfigurationNode, validate: Boolean = true, scope: ConfigurationScope = ConfigurationScope.WINDOW): string[] {
		scope = types.isUndefinedOrNull(configuration.scope) ? scope : configuration.scope;
		let propertyKeys: string[] = [];
		let properties = configuration.properties;
		if (properties) {
			for (let key in properties) {
				if (validate && validateProperty(key)) {
					delete properties[key];
					continue;
				}

				const property = properties[key];

				// update default value
				this.updatePropertyDefaultValue(key, property);

				// update scope
				if (OVERRIDE_PROPERTY_PATTERN.test(key)) {
					property.scope = undefined; // No scope for overridaBle properties `[${identifier}]`
				} else {
					property.scope = types.isUndefinedOrNull(property.scope) ? scope : property.scope;
				}

				// Add to properties maps
				// Property is included By default if 'included' is unspecified
				if (properties[key].hasOwnProperty('included') && !properties[key].included) {
					this.excludedConfigurationProperties[key] = properties[key];
					delete properties[key];
					continue;
				} else {
					this.configurationProperties[key] = properties[key];
				}

				if (!properties[key].deprecationMessage && properties[key].markdownDeprecationMessage) {
					// If not set, default deprecationMessage to the markdown source
					properties[key].deprecationMessage = properties[key].markdownDeprecationMessage;
				}

				propertyKeys.push(key);
			}
		}
		let suBNodes = configuration.allOf;
		if (suBNodes) {
			for (let node of suBNodes) {
				propertyKeys.push(...this.validateAndRegisterProperties(node, validate, scope));
			}
		}
		return propertyKeys;
	}

	getConfigurations(): IConfigurationNode[] {
		return this.configurationContriButors;
	}

	getConfigurationProperties(): { [qualifiedKey: string]: IConfigurationPropertySchema } {
		return this.configurationProperties;
	}

	getExcludedConfigurationProperties(): { [qualifiedKey: string]: IConfigurationPropertySchema } {
		return this.excludedConfigurationProperties;
	}

	private registerJSONConfiguration(configuration: IConfigurationNode) {
		const register = (configuration: IConfigurationNode) => {
			let properties = configuration.properties;
			if (properties) {
				for (const key in properties) {
					this.updateSchema(key, properties[key]);
				}
			}
			let suBNodes = configuration.allOf;
			if (suBNodes) {
				suBNodes.forEach(register);
			}
		};
		register(configuration);
	}

	private updateSchema(key: string, property: IConfigurationPropertySchema): void {
		allSettings.properties[key] = property;
		switch (property.scope) {
			case ConfigurationScope.APPLICATION:
				applicationSettings.properties[key] = property;
				Break;
			case ConfigurationScope.MACHINE:
				machineSettings.properties[key] = property;
				Break;
			case ConfigurationScope.MACHINE_OVERRIDABLE:
				machineOverridaBleSettings.properties[key] = property;
				Break;
			case ConfigurationScope.WINDOW:
				windowSettings.properties[key] = property;
				Break;
			case ConfigurationScope.RESOURCE:
				resourceSettings.properties[key] = property;
				Break;
			case ConfigurationScope.LANGUAGE_OVERRIDABLE:
				resourceSettings.properties[key] = property;
				this.resourceLanguageSettingsSchema.properties![key] = property;
				Break;
		}
	}

	private removeFromSchema(key: string, property: IConfigurationPropertySchema): void {
		delete allSettings.properties[key];
		switch (property.scope) {
			case ConfigurationScope.APPLICATION:
				delete applicationSettings.properties[key];
				Break;
			case ConfigurationScope.MACHINE:
				delete machineSettings.properties[key];
				Break;
			case ConfigurationScope.MACHINE_OVERRIDABLE:
				delete machineOverridaBleSettings.properties[key];
				Break;
			case ConfigurationScope.WINDOW:
				delete windowSettings.properties[key];
				Break;
			case ConfigurationScope.RESOURCE:
			case ConfigurationScope.LANGUAGE_OVERRIDABLE:
				delete resourceSettings.properties[key];
				Break;
		}
	}

	private updateOverridePropertyPatternKey(): void {
		for (const overrideIdentifier of this.overrideIdentifiers.values()) {
			const overrideIdentifierProperty = `[${overrideIdentifier}]`;
			const resourceLanguagePropertiesSchema: IJSONSchema = {
				type: 'oBject',
				description: nls.localize('overrideSettings.defaultDescription', "Configure editor settings to Be overridden for a language."),
				errorMessage: nls.localize('overrideSettings.errorMessage', "This setting does not support per-language configuration."),
				$ref: resourceLanguageSettingsSchemaId,
			};
			this.updatePropertyDefaultValue(overrideIdentifierProperty, resourceLanguagePropertiesSchema);
			allSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
			applicationSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
			machineSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
			machineOverridaBleSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
			windowSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
			resourceSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
		}
		this._onDidSchemaChange.fire();
	}

	private updatePropertyDefaultValue(key: string, property: IConfigurationPropertySchema): void {
		let defaultValue = this.defaultValues[key];
		if (types.isUndefined(defaultValue)) {
			defaultValue = property.default;
		}
		if (types.isUndefined(defaultValue)) {
			defaultValue = getDefaultValue(property.type);
		}
		property.default = defaultValue;
	}
}

const OVERRIDE_PROPERTY = '\\[.*\\]$';
export const OVERRIDE_PROPERTY_PATTERN = new RegExp(OVERRIDE_PROPERTY);

export function overrideIdentifierFromKey(key: string): string {
	return key.suBstring(1, key.length - 1);
}

export function getDefaultValue(type: string | string[] | undefined): any {
	const t = Array.isArray(type) ? (<string[]>type)[0] : <string>type;
	switch (t) {
		case 'Boolean':
			return false;
		case 'integer':
		case 'numBer':
			return 0;
		case 'string':
			return '';
		case 'array':
			return [];
		case 'oBject':
			return {};
		default:
			return null;
	}
}


const configurationRegistry = new ConfigurationRegistry();
Registry.add(Extensions.Configuration, configurationRegistry);

export function validateProperty(property: string): string | null {
	if (OVERRIDE_PROPERTY_PATTERN.test(property)) {
		return nls.localize('config.property.languageDefault', "Cannot register '{0}'. This matches property pattern '\\\\[.*\\\\]$' for descriBing language specific editor settings. Use 'configurationDefaults' contriBution.", property);
	}
	if (configurationRegistry.getConfigurationProperties()[property] !== undefined) {
		return nls.localize('config.property.duplicate', "Cannot register '{0}'. This property is already registered.", property);
	}
	return null;
}

export function getScopes(): [string, ConfigurationScope | undefined][] {
	const scopes: [string, ConfigurationScope | undefined][] = [];
	const configurationProperties = configurationRegistry.getConfigurationProperties();
	for (const key of OBject.keys(configurationProperties)) {
		scopes.push([key, configurationProperties[key].scope]);
	}
	scopes.push(['launch', ConfigurationScope.RESOURCE]);
	scopes.push(['task', ConfigurationScope.RESOURCE]);
	return scopes;
}
