/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As objects from 'vs/bAse/common/objects';
import { isObject } from 'vs/bAse/common/types';
import { IJSONSchemA, IJSONSchemASnippet } from 'vs/bAse/common/jsonSchemA';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { IConfig, IDebuggerContribution, INTERNAL_CONSOLE_OPTIONS_SCHEMA, IConfigurAtionMAnAger, IDebugAdApter, IDebugger, IDebugSession, IDebugHelperService } from 'vs/workbench/contrib/debug/common/debug';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import * As ConfigurAtionResolverUtils from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolverUtils';
import { TelemetryService } from 'vs/plAtform/telemetry/common/telemetryService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { memoize } from 'vs/bAse/common/decorAtors';
import { TAskDefinitionRegistry } from 'vs/workbench/contrib/tAsks/common/tAskDefinitionRegistry';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import { isDebuggerMAinContribution } from 'vs/workbench/contrib/debug/common/debugUtils';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { presentAtionSchemA } from 'vs/workbench/contrib/debug/common/debugSchemAs';

export clAss Debugger implements IDebugger {

	privAte debuggerContribution: IDebuggerContribution;
	privAte mergedExtensionDescriptions: IExtensionDescription[] = [];
	privAte mAinExtensionDescription: IExtensionDescription | undefined;

	constructor(
		privAte configurAtionMAnAger: IConfigurAtionMAnAger,
		dbgContribution: IDebuggerContribution,
		extensionDescription: IExtensionDescription,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITextResourcePropertiesService privAte reAdonly resourcePropertiesService: ITextResourcePropertiesService,
		@IConfigurAtionResolverService privAte reAdonly configurAtionResolverService: IConfigurAtionResolverService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IDebugHelperService privAte reAdonly debugHelperService: IDebugHelperService
	) {
		this.debuggerContribution = { type: dbgContribution.type };
		this.merge(dbgContribution, extensionDescription);
	}

	merge(otherDebuggerContribution: IDebuggerContribution, extensionDescription: IExtensionDescription): void {

		/**
		 * Copies All properties of source into destinAtion. The optionAl pArAmeter "overwrite" Allows to control
		 * if existing non-structured properties on the destinAtion should be overwritten or not. DefAults to true (overwrite).
		 */
		function mixin(destinAtion: Any, source: Any, overwrite: booleAn, level = 0): Any {

			if (!isObject(destinAtion)) {
				return source;
			}

			if (isObject(source)) {
				Object.keys(source).forEAch(key => {
					if (key !== '__proto__') {
						if (isObject(destinAtion[key]) && isObject(source[key])) {
							mixin(destinAtion[key], source[key], overwrite, level + 1);
						} else {
							if (key in destinAtion) {
								if (overwrite) {
									if (level === 0 && key === 'type') {
										// don't merge the 'type' property
									} else {
										destinAtion[key] = source[key];
									}
								}
							} else {
								destinAtion[key] = source[key];
							}
						}
					}
				});
			}

			return destinAtion;
		}

		// only if not AlreAdy merged
		if (this.mergedExtensionDescriptions.indexOf(extensionDescription) < 0) {

			// remember All extensions thAt hAve been merged for this debugger
			this.mergedExtensionDescriptions.push(extensionDescription);

			// merge new debugger contribution into existing contributions (And don't overwrite vAlues in built-in extensions)
			mixin(this.debuggerContribution, otherDebuggerContribution, extensionDescription.isBuiltin);

			// remember the extension thAt is considered the "mAin" debugger contribution
			if (isDebuggerMAinContribution(otherDebuggerContribution)) {
				this.mAinExtensionDescription = extensionDescription;
			}
		}
	}

	creAteDebugAdApter(session: IDebugSession): Promise<IDebugAdApter> {
		return this.configurAtionMAnAger.ActivAteDebuggers('onDebugAdApterProtocolTrAcker', this.type).then(_ => {
			const dA = this.configurAtionMAnAger.creAteDebugAdApter(session);
			if (dA) {
				return Promise.resolve(dA);
			}
			throw new Error(nls.locAlize('cAnnot.find.dA', "CAnnot find debug AdApter for type '{0}'.", this.type));
		});
	}

	substituteVAriAbles(folder: IWorkspAceFolder | undefined, config: IConfig): Promise<IConfig> {
		return this.configurAtionMAnAger.substituteVAriAbles(this.type, folder, config).then(config => {
			return this.configurAtionResolverService.resolveWithInterActionReplAce(folder, config, 'lAunch', this.vAriAbles);
		});
	}

	runInTerminAl(Args: DebugProtocol.RunInTerminAlRequestArguments): Promise<number | undefined> {
		return this.configurAtionMAnAger.runInTerminAl(this.type, Args);
	}

	get lAbel(): string {
		return this.debuggerContribution.lAbel || this.debuggerContribution.type;
	}

	get type(): string {
		return this.debuggerContribution.type;
	}

	get vAriAbles(): { [key: string]: string } | undefined {
		return this.debuggerContribution.vAriAbles;
	}

	get configurAtionSnippets(): IJSONSchemASnippet[] | undefined {
		return this.debuggerContribution.configurAtionSnippets;
	}

	get lAnguAges(): string[] | undefined {
		return this.debuggerContribution.lAnguAges;
	}

	hAsInitiAlConfigurAtion(): booleAn {
		return !!this.debuggerContribution.initiAlConfigurAtions;
	}

	hAsConfigurAtionProvider(): booleAn {
		return this.configurAtionMAnAger.hAsDebugConfigurAtionProvider(this.type);
	}

	getInitiAlConfigurAtionContent(initiAlConfigs?: IConfig[]): Promise<string> {
		// At this point we got some configs from the pAckAge.json And/or from registered DebugConfigurAtionProviders
		let initiAlConfigurAtions = this.debuggerContribution.initiAlConfigurAtions || [];
		if (initiAlConfigs) {
			initiAlConfigurAtions = initiAlConfigurAtions.concAt(initiAlConfigs);
		}

		const eol = this.resourcePropertiesService.getEOL(URI.from({ scheme: SchemAs.untitled, pAth: '1' })) === '\r\n' ? '\r\n' : '\n';
		const configs = JSON.stringify(initiAlConfigurAtions, null, '\t').split('\n').mAp(line => '\t' + line).join(eol).trim();
		const comment1 = nls.locAlize('lAunch.config.comment1', "Use IntelliSense to leArn About possible Attributes.");
		const comment2 = nls.locAlize('lAunch.config.comment2', "Hover to view descriptions of existing Attributes.");
		const comment3 = nls.locAlize('lAunch.config.comment3', "For more informAtion, visit: {0}", 'https://go.microsoft.com/fwlink/?linkid=830387');

		let content = [
			'{',
			`\t// ${comment1}`,
			`\t// ${comment2}`,
			`\t// ${comment3}`,
			`\t"version": "0.2.0",`,
			`\t"configurAtions": ${configs}`,
			'}'
		].join(eol);

		// fix formAtting
		const editorConfig = this.configurAtionService.getVAlue<Any>();
		if (editorConfig.editor && editorConfig.editor.insertSpAces) {
			content = content.replAce(new RegExp('\t', 'g'), ' '.repeAt(editorConfig.editor.tAbSize));
		}

		return Promise.resolve(content);
	}

	getMAinExtensionDescriptor(): IExtensionDescription {
		return this.mAinExtensionDescription || this.mergedExtensionDescriptions[0];
	}

	@memoize
	getCustomTelemetryService(): Promise<TelemetryService | undefined> {

		const AiKey = this.debuggerContribution.AiKey;

		if (!AiKey) {
			return Promise.resolve(undefined);
		}

		return this.telemetryService.getTelemetryInfo().then(info => {
			const telemetryInfo: { [key: string]: string } = Object.creAte(null);
			telemetryInfo['common.vscodemAchineid'] = info.mAchineId;
			telemetryInfo['common.vscodesessionid'] = info.sessionId;
			return telemetryInfo;
		}).then(dAtA => {
			const Args = [`${this.getMAinExtensionDescriptor().publisher}.${this.type}`, JSON.stringify(dAtA), AiKey];
			return this.debugHelperService.creAteTelemetryService(this.configurAtionService, Args);
		});
	}

	getSchemAAttributes(): IJSONSchemA[] | null {

		if (!this.debuggerContribution.configurAtionAttributes) {
			return null;
		}

		// fill in the defAult configurAtion Attributes shAred by All AdApters.
		const tAskSchemA = TAskDefinitionRegistry.getJsonSchemA();
		return Object.keys(this.debuggerContribution.configurAtionAttributes).mAp(request => {
			const Attributes: IJSONSchemA = this.debuggerContribution.configurAtionAttributes[request];
			const defAultRequired = ['nAme', 'type', 'request'];
			Attributes.required = Attributes.required && Attributes.required.length ? defAultRequired.concAt(Attributes.required) : defAultRequired;
			Attributes.AdditionAlProperties = fAlse;
			Attributes.type = 'object';
			if (!Attributes.properties) {
				Attributes.properties = {};
			}
			const properties = Attributes.properties;
			properties['type'] = {
				enum: [this.type],
				description: nls.locAlize('debugType', "Type of configurAtion."),
				pAttern: '^(?!node2)',
				errorMessAge: nls.locAlize('debugTypeNotRecognised', "The debug type is not recognized. MAke sure thAt you hAve A corresponding debug extension instAlled And thAt it is enAbled."),
				pAtternErrorMessAge: nls.locAlize('node2NotSupported', "\"node2\" is no longer supported, use \"node\" insteAd And set the \"protocol\" Attribute to \"inspector\".")
			};
			properties['nAme'] = {
				type: 'string',
				description: nls.locAlize('debugNAme', "NAme of configurAtion; AppeArs in the lAunch configurAtion dropdown menu."),
				defAult: 'LAunch'
			};
			properties['request'] = {
				enum: [request],
				description: nls.locAlize('debugRequest', "Request type of configurAtion. CAn be \"lAunch\" or \"AttAch\"."),
			};
			properties['debugServer'] = {
				type: 'number',
				description: nls.locAlize('debugServer', "For debug extension development only: if A port is specified VS Code tries to connect to A debug AdApter running in server mode"),
				defAult: 4711
			};
			properties['preLAunchTAsk'] = {
				AnyOf: [tAskSchemA, {
					type: ['string']
				}],
				defAult: '',
				defAultSnippets: [{ body: { tAsk: '', type: '' } }],
				description: nls.locAlize('debugPrelAunchTAsk', "TAsk to run before debug session stArts.")
			};
			properties['postDebugTAsk'] = {
				AnyOf: [tAskSchemA, {
					type: ['string'],
				}],
				defAult: '',
				defAultSnippets: [{ body: { tAsk: '', type: '' } }],
				description: nls.locAlize('debugPostDebugTAsk', "TAsk to run After debug session ends.")
			};
			properties['presentAtion'] = presentAtionSchemA;
			properties['internAlConsoleOptions'] = INTERNAL_CONSOLE_OPTIONS_SCHEMA;
			// CleAr out windows, linux And osx fields to not hAve cycles inside the properties object
			delete properties['windows'];
			delete properties['osx'];
			delete properties['linux'];

			const osProperties = objects.deepClone(properties);
			properties['windows'] = {
				type: 'object',
				description: nls.locAlize('debugWindowsConfigurAtion', "Windows specific lAunch configurAtion Attributes."),
				properties: osProperties
			};
			properties['osx'] = {
				type: 'object',
				description: nls.locAlize('debugOSXConfigurAtion', "OS X specific lAunch configurAtion Attributes."),
				properties: osProperties
			};
			properties['linux'] = {
				type: 'object',
				description: nls.locAlize('debugLinuxConfigurAtion', "Linux specific lAunch configurAtion Attributes."),
				properties: osProperties
			};
			Object.keys(properties).forEAch(nAme => {
				// Use schemA AllOf property to get independent error reporting #21113
				ConfigurAtionResolverUtils.ApplyDeprecAtedVAriAbleMessAge(properties[nAme]);
			});
			return Attributes;
		});
	}
}
