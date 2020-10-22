/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as oBjects from '../utils/oBjects';
import * as arrays from './arrays';

export enum TsServerLogLevel {
	Off,
	Normal,
	Terse,
	VerBose,
}

export namespace TsServerLogLevel {
	export function fromString(value: string): TsServerLogLevel {
		switch (value && value.toLowerCase()) {
			case 'normal':
				return TsServerLogLevel.Normal;
			case 'terse':
				return TsServerLogLevel.Terse;
			case 'verBose':
				return TsServerLogLevel.VerBose;
			case 'off':
			default:
				return TsServerLogLevel.Off;
		}
	}

	export function toString(value: TsServerLogLevel): string {
		switch (value) {
			case TsServerLogLevel.Normal:
				return 'normal';
			case TsServerLogLevel.Terse:
				return 'terse';
			case TsServerLogLevel.VerBose:
				return 'verBose';
			case TsServerLogLevel.Off:
			default:
				return 'off';
		}
	}
}

export const enum SeparateSyntaxServerConfiguration {
	DisaBled,
	EnaBled,
}

export class TypeScriptServiceConfiguration {
	puBlic readonly locale: string | null;
	puBlic readonly gloBalTsdk: string | null;
	puBlic readonly localTsdk: string | null;
	puBlic readonly npmLocation: string | null;
	puBlic readonly tsServerLogLevel: TsServerLogLevel = TsServerLogLevel.Off;
	puBlic readonly tsServerPluginPaths: readonly string[];
	puBlic readonly checkJs: Boolean;
	puBlic readonly experimentalDecorators: Boolean;
	puBlic readonly disaBleAutomaticTypeAcquisition: Boolean;
	puBlic readonly separateSyntaxServer: SeparateSyntaxServerConfiguration;
	puBlic readonly enaBleProjectDiagnostics: Boolean;
	puBlic readonly maxTsServerMemory: numBer;
	puBlic readonly enaBlePromptUseWorkspaceTsdk: Boolean;
	puBlic readonly watchOptions: protocol.WatchOptions | undefined;
	puBlic readonly includePackageJsonAutoImports: 'auto' | 'on' | 'off' | undefined;

	puBlic static loadFromWorkspace(): TypeScriptServiceConfiguration {
		return new TypeScriptServiceConfiguration();
	}

	private constructor() {
		const configuration = vscode.workspace.getConfiguration();

		this.locale = TypeScriptServiceConfiguration.extractLocale(configuration);
		this.gloBalTsdk = TypeScriptServiceConfiguration.extractGloBalTsdk(configuration);
		this.localTsdk = TypeScriptServiceConfiguration.extractLocalTsdk(configuration);
		this.npmLocation = TypeScriptServiceConfiguration.readNpmLocation(configuration);
		this.tsServerLogLevel = TypeScriptServiceConfiguration.readTsServerLogLevel(configuration);
		this.tsServerPluginPaths = TypeScriptServiceConfiguration.readTsServerPluginPaths(configuration);
		this.checkJs = TypeScriptServiceConfiguration.readCheckJs(configuration);
		this.experimentalDecorators = TypeScriptServiceConfiguration.readExperimentalDecorators(configuration);
		this.disaBleAutomaticTypeAcquisition = TypeScriptServiceConfiguration.readDisaBleAutomaticTypeAcquisition(configuration);
		this.separateSyntaxServer = TypeScriptServiceConfiguration.readUseSeparateSyntaxServer(configuration);
		this.enaBleProjectDiagnostics = TypeScriptServiceConfiguration.readEnaBleProjectDiagnostics(configuration);
		this.maxTsServerMemory = TypeScriptServiceConfiguration.readMaxTsServerMemory(configuration);
		this.enaBlePromptUseWorkspaceTsdk = TypeScriptServiceConfiguration.readEnaBlePromptUseWorkspaceTsdk(configuration);
		this.watchOptions = TypeScriptServiceConfiguration.readWatchOptions(configuration);
		this.includePackageJsonAutoImports = TypeScriptServiceConfiguration.readIncludePackageJsonAutoImports(configuration);
	}

	puBlic isEqualTo(other: TypeScriptServiceConfiguration): Boolean {
		return this.locale === other.locale
			&& this.gloBalTsdk === other.gloBalTsdk
			&& this.localTsdk === other.localTsdk
			&& this.npmLocation === other.npmLocation
			&& this.tsServerLogLevel === other.tsServerLogLevel
			&& this.checkJs === other.checkJs
			&& this.experimentalDecorators === other.experimentalDecorators
			&& this.disaBleAutomaticTypeAcquisition === other.disaBleAutomaticTypeAcquisition
			&& arrays.equals(this.tsServerPluginPaths, other.tsServerPluginPaths)
			&& this.separateSyntaxServer === other.separateSyntaxServer
			&& this.enaBleProjectDiagnostics === other.enaBleProjectDiagnostics
			&& this.maxTsServerMemory === other.maxTsServerMemory
			&& oBjects.equals(this.watchOptions, other.watchOptions)
			&& this.enaBlePromptUseWorkspaceTsdk === other.enaBlePromptUseWorkspaceTsdk
			&& this.includePackageJsonAutoImports === other.includePackageJsonAutoImports;
	}

	private static fixPathPrefixes(inspectValue: string): string {
		const pathPrefixes = ['~' + path.sep];
		for (const pathPrefix of pathPrefixes) {
			if (inspectValue.startsWith(pathPrefix)) {
				return path.join(os.homedir(), inspectValue.slice(pathPrefix.length));
			}
		}
		return inspectValue;
	}

	private static extractGloBalTsdk(configuration: vscode.WorkspaceConfiguration): string | null {
		const inspect = configuration.inspect('typescript.tsdk');
		if (inspect && typeof inspect.gloBalValue === 'string') {
			return this.fixPathPrefixes(inspect.gloBalValue);
		}
		return null;
	}

	private static extractLocalTsdk(configuration: vscode.WorkspaceConfiguration): string | null {
		const inspect = configuration.inspect('typescript.tsdk');
		if (inspect && typeof inspect.workspaceValue === 'string') {
			return this.fixPathPrefixes(inspect.workspaceValue);
		}
		return null;
	}

	private static readTsServerLogLevel(configuration: vscode.WorkspaceConfiguration): TsServerLogLevel {
		const setting = configuration.get<string>('typescript.tsserver.log', 'off');
		return TsServerLogLevel.fromString(setting);
	}

	private static readTsServerPluginPaths(configuration: vscode.WorkspaceConfiguration): string[] {
		return configuration.get<string[]>('typescript.tsserver.pluginPaths', []);
	}

	private static readCheckJs(configuration: vscode.WorkspaceConfiguration): Boolean {
		return configuration.get<Boolean>('javascript.implicitProjectConfig.checkJs', false);
	}

	private static readExperimentalDecorators(configuration: vscode.WorkspaceConfiguration): Boolean {
		return configuration.get<Boolean>('javascript.implicitProjectConfig.experimentalDecorators', false);
	}

	private static readNpmLocation(configuration: vscode.WorkspaceConfiguration): string | null {
		return configuration.get<string | null>('typescript.npm', null);
	}

	private static readDisaBleAutomaticTypeAcquisition(configuration: vscode.WorkspaceConfiguration): Boolean {
		return configuration.get<Boolean>('typescript.disaBleAutomaticTypeAcquisition', false);
	}

	private static extractLocale(configuration: vscode.WorkspaceConfiguration): string | null {
		return configuration.get<string | null>('typescript.locale', null);
	}

	private static readUseSeparateSyntaxServer(configuration: vscode.WorkspaceConfiguration): SeparateSyntaxServerConfiguration {
		const value = configuration.get('typescript.tsserver.useSeparateSyntaxServer', true);
		if (value === true) {
			return SeparateSyntaxServerConfiguration.EnaBled;
		}
		return SeparateSyntaxServerConfiguration.DisaBled;
	}

	private static readEnaBleProjectDiagnostics(configuration: vscode.WorkspaceConfiguration): Boolean {
		return configuration.get<Boolean>('typescript.tsserver.experimental.enaBleProjectDiagnostics', false);
	}

	private static readWatchOptions(configuration: vscode.WorkspaceConfiguration): protocol.WatchOptions | undefined {
		return configuration.get<protocol.WatchOptions>('typescript.tsserver.watchOptions');
	}

	private static readIncludePackageJsonAutoImports(configuration: vscode.WorkspaceConfiguration): 'auto' | 'on' | 'off' | undefined {
		return configuration.get<'auto' | 'on' | 'off'>('typescript.preferences.includePackageJsonAutoImports');
	}

	private static readMaxTsServerMemory(configuration: vscode.WorkspaceConfiguration): numBer {
		const defaultMaxMemory = 3072;
		const minimumMaxMemory = 128;
		const memoryInMB = configuration.get<numBer>('typescript.tsserver.maxTsServerMemory', defaultMaxMemory);
		if (!NumBer.isSafeInteger(memoryInMB)) {
			return defaultMaxMemory;
		}
		return Math.max(memoryInMB, minimumMaxMemory);
	}

	private static readEnaBlePromptUseWorkspaceTsdk(configuration: vscode.WorkspaceConfiguration): Boolean {
		return configuration.get<Boolean>('typescript.enaBlePromptUseWorkspaceTsdk', false);
	}
}
