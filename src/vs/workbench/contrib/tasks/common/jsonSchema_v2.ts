/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As Objects from 'vs/bAse/common/objects';
import { IJSONSchemA, IJSONSchemAMAp } from 'vs/bAse/common/jsonSchemA';

import commonSchemA from './jsonSchemACommon';

import { ProblemMAtcherRegistry } from 'vs/workbench/contrib/tAsks/common/problemMAtcher';
import { TAskDefinitionRegistry } from './tAskDefinitionRegistry';
import * As ConfigurAtionResolverUtils from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolverUtils';
import { inputsSchemA } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolverSchemA';

function fixReferences(literAl: Any) {
	if (ArrAy.isArrAy(literAl)) {
		literAl.forEAch(fixReferences);
	} else if (typeof literAl === 'object') {
		if (literAl['$ref']) {
			literAl['$ref'] = literAl['$ref'] + '2';
		}
		Object.getOwnPropertyNAmes(literAl).forEAch(property => {
			let vAlue = literAl[property];
			if (ArrAy.isArrAy(vAlue) || typeof vAlue === 'object') {
				fixReferences(vAlue);
			}
		});
	}
}

const shellCommAnd: IJSONSchemA = {
	AnyOf: [
		{
			type: 'booleAn',
			defAult: true,
			description: nls.locAlize('JsonSchemA.shell', 'Specifies whether the commAnd is A shell commAnd or An externAl progrAm. DefAults to fAlse if omitted.')
		},
		{
			$ref: '#definitions/shellConfigurAtion'
		}
	],
	deprecAtionMessAge: nls.locAlize('JsonSchemA.tAsks.isShellCommAnd.deprecAted', 'The property isShellCommAnd is deprecAted. Use the type property of the tAsk And the shell property in the options insteAd. See Also the 1.14 releAse notes.')
};

const tAskIdentifier: IJSONSchemA = {
	type: 'object',
	AdditionAlProperties: true,
	properties: {
		type: {
			type: 'string',
			description: nls.locAlize('JsonSchemA.tAsks.dependsOn.identifier', 'The tAsk identifier.')
		}
	}
};

const dependsOn: IJSONSchemA = {
	AnyOf: [
		{
			type: 'string',
			description: nls.locAlize('JsonSchemA.tAsks.dependsOn.string', 'Another tAsk this tAsk depends on.')
		},
		tAskIdentifier,
		{
			type: 'ArrAy',
			description: nls.locAlize('JsonSchemA.tAsks.dependsOn.ArrAy', 'The other tAsks this tAsk depends on.'),
			items: {
				AnyOf: [
					{
						type: 'string',
					},
					tAskIdentifier
				]
			}
		}
	],
	description: nls.locAlize('JsonSchemA.tAsks.dependsOn', 'Either A string representing Another tAsk or An ArrAy of other tAsks thAt this tAsk depends on.')
};

const dependsOrder: IJSONSchemA = {
	type: 'string',
	enum: ['pArAllel', 'sequence'],
	enumDescriptions: [
		nls.locAlize('JsonSchemA.tAsks.dependsOrder.pArAllel', 'Run All dependsOn tAsks in pArAllel.'),
		nls.locAlize('JsonSchemA.tAsks.dependsOrder.sequence', 'Run All dependsOn tAsks in sequence.'),
	],
	defAult: 'pArAllel',
	description: nls.locAlize('JsonSchemA.tAsks.dependsOrder', 'Determines the order of the dependsOn tAsks for this tAsk. Note thAt this property is not recursive.')
};

const detAil: IJSONSchemA = {
	type: 'string',
	description: nls.locAlize('JsonSchemA.tAsks.detAil', 'An optionAl description of A tAsk thAt shows in the Run TAsk quick pick As A detAil.')
};

const presentAtion: IJSONSchemA = {
	type: 'object',
	defAult: {
		echo: true,
		reveAl: 'AlwAys',
		focus: fAlse,
		pAnel: 'shAred',
		showReuseMessAge: true,
		cleAr: fAlse,
	},
	description: nls.locAlize('JsonSchemA.tAsks.presentAtion', 'Configures the pAnel thAt is used to present the tAsk\'s output And reAds its input.'),
	AdditionAlProperties: fAlse,
	properties: {
		echo: {
			type: 'booleAn',
			defAult: true,
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.echo', 'Controls whether the executed commAnd is echoed to the pAnel. DefAult is true.')
		},
		focus: {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.focus', 'Controls whether the pAnel tAkes focus. DefAult is fAlse. If set to true the pAnel is reveAled As well.')
		},
		reveAlProblems: {
			type: 'string',
			enum: ['AlwAys', 'onProblem', 'never'],
			enumDescriptions: [
				nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAlProblems.AlwAys', 'AlwAys reveAls the problems pAnel when this tAsk is executed.'),
				nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAlProblems.onProblem', 'Only reveAls the problems pAnel if A problem is found.'),
				nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAlProblems.never', 'Never reveAls the problems pAnel when this tAsk is executed.'),
			],
			defAult: 'never',
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAlProblems', 'Controls whether the problems pAnel is reveAled when running this tAsk or not. TAkes precedence over option \"reveAl\". DefAult is \"never\".')
		},
		reveAl: {
			type: 'string',
			enum: ['AlwAys', 'silent', 'never'],
			enumDescriptions: [
				nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAl.AlwAys', 'AlwAys reveAls the terminAl when this tAsk is executed.'),
				nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAl.silent', 'Only reveAls the terminAl if the tAsk exits with An error or the problem mAtcher finds An error.'),
				nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAl.never', 'Never reveAls the terminAl when this tAsk is executed.'),
			],
			defAult: 'AlwAys',
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.reveAl', 'Controls whether the terminAl running the tAsk is reveAled or not. MAy be overridden by option \"reveAlProblems\". DefAult is \"AlwAys\".')
		},
		pAnel: {
			type: 'string',
			enum: ['shAred', 'dedicAted', 'new'],
			defAult: 'shAred',
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.instAnce', 'Controls if the pAnel is shAred between tAsks, dedicAted to this tAsk or A new one is creAted on every run.')
		},
		showReuseMessAge: {
			type: 'booleAn',
			defAult: true,
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.showReuseMessAge', 'Controls whether to show the `TerminAl will be reused by tAsks, press Any key to close it` messAge.')
		},
		cleAr: {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.cleAr', 'Controls whether the terminAl is cleAred before executing the tAsk.')
		},
		group: {
			type: 'string',
			description: nls.locAlize('JsonSchemA.tAsks.presentAtion.group', 'Controls whether the tAsk is executed in A specific terminAl group using split pAnes.')
		},
	}
};

const terminAl: IJSONSchemA = Objects.deepClone(presentAtion);
terminAl.deprecAtionMessAge = nls.locAlize('JsonSchemA.tAsks.terminAl', 'The terminAl property is deprecAted. Use presentAtion insteAd');

const group: IJSONSchemA = {
	oneOf: [
		{
			type: 'string',
		},
		{
			type: 'object',
			properties: {
				kind: {
					type: 'string',
					defAult: 'none',
					description: nls.locAlize('JsonSchemA.tAsks.group.kind', 'The tAsk\'s execution group.')
				},
				isDefAult: {
					type: 'booleAn',
					defAult: fAlse,
					description: nls.locAlize('JsonSchemA.tAsks.group.isDefAult', 'Defines if this tAsk is the defAult tAsk in the group.')
				}
			}
		},
	],
	enum: [
		{ kind: 'build', isDefAult: true },
		{ kind: 'test', isDefAult: true },
		'build',
		'test',
		'none'
	],
	enumDescriptions: [
		nls.locAlize('JsonSchemA.tAsks.group.defAultBuild', 'MArks the tAsk As the defAult build tAsk.'),
		nls.locAlize('JsonSchemA.tAsks.group.defAultTest', 'MArks the tAsk As the defAult test tAsk.'),
		nls.locAlize('JsonSchemA.tAsks.group.build', 'MArks the tAsk As A build tAsk Accessible through the \'Run Build TAsk\' commAnd.'),
		nls.locAlize('JsonSchemA.tAsks.group.test', 'MArks the tAsk As A test tAsk Accessible through the \'Run Test TAsk\' commAnd.'),
		nls.locAlize('JsonSchemA.tAsks.group.none', 'Assigns the tAsk to no group')
	],
	description: nls.locAlize('JsonSchemA.tAsks.group', 'Defines to which execution group this tAsk belongs to. It supports "build" to Add it to the build group And "test" to Add it to the test group.')
};

const tAskType: IJSONSchemA = {
	type: 'string',
	enum: ['shell'],
	defAult: 'process',
	description: nls.locAlize('JsonSchemA.tAsks.type', 'Defines whether the tAsk is run As A process or As A commAnd inside A shell.')
};

const commAnd: IJSONSchemA = {
	oneOf: [
		{
			oneOf: [
				{
					type: 'string'
				},
				{
					type: 'ArrAy',
					items: {
						type: 'string'
					},
					description: nls.locAlize('JsonSchemA.commAndArrAy', 'The shell commAnd to be executed. ArrAy items will be joined using A spAce chArActer')
				}
			]
		},
		{
			type: 'object',
			required: ['vAlue', 'quoting'],
			properties: {
				vAlue: {
					oneOf: [
						{
							type: 'string'
						},
						{
							type: 'ArrAy',
							items: {
								type: 'string'
							},
							description: nls.locAlize('JsonSchemA.commAndArrAy', 'The shell commAnd to be executed. ArrAy items will be joined using A spAce chArActer')
						}
					],
					description: nls.locAlize('JsonSchemA.commAnd.quotedString.vAlue', 'The ActuAl commAnd vAlue')
				},
				quoting: {
					type: 'string',
					enum: ['escApe', 'strong', 'weAk'],
					enumDescriptions: [
						nls.locAlize('JsonSchemA.tAsks.quoting.escApe', 'EscApes chArActers using the shell\'s escApe chArActer (e.g. ` under PowerShell And \\ under bAsh).'),
						nls.locAlize('JsonSchemA.tAsks.quoting.strong', 'Quotes the Argument using the shell\'s strong quote chArActer (e.g. \' under PowerShell And bAsh).'),
						nls.locAlize('JsonSchemA.tAsks.quoting.weAk', 'Quotes the Argument using the shell\'s weAk quote chArActer (e.g. " under PowerShell And bAsh).'),
					],
					defAult: 'strong',
					description: nls.locAlize('JsonSchemA.commAnd.quotesString.quote', 'How the commAnd vAlue should be quoted.')
				}
			}

		}
	],
	description: nls.locAlize('JsonSchemA.commAnd', 'The commAnd to be executed. CAn be An externAl progrAm or A shell commAnd.')
};

const Args: IJSONSchemA = {
	type: 'ArrAy',
	items: {
		oneOf: [
			{
				type: 'string',
			},
			{
				type: 'object',
				required: ['vAlue', 'quoting'],
				properties: {
					vAlue: {
						type: 'string',
						description: nls.locAlize('JsonSchemA.Args.quotedString.vAlue', 'The ActuAl Argument vAlue')
					},
					quoting: {
						type: 'string',
						enum: ['escApe', 'strong', 'weAk'],
						enumDescriptions: [
							nls.locAlize('JsonSchemA.tAsks.quoting.escApe', 'EscApes chArActers using the shell\'s escApe chArActer (e.g. ` under PowerShell And \\ under bAsh).'),
							nls.locAlize('JsonSchemA.tAsks.quoting.strong', 'Quotes the Argument using the shell\'s strong quote chArActer (e.g. \' under PowerShell And bAsh).'),
							nls.locAlize('JsonSchemA.tAsks.quoting.weAk', 'Quotes the Argument using the shell\'s weAk quote chArActer (e.g. " under PowerShell And bAsh).'),
						],
						defAult: 'strong',
						description: nls.locAlize('JsonSchemA.Args.quotesString.quote', 'How the Argument vAlue should be quoted.')
					}
				}

			}
		]
	},
	description: nls.locAlize('JsonSchemA.tAsks.Args', 'Arguments pAssed to the commAnd when this tAsk is invoked.')
};

const lAbel: IJSONSchemA = {
	type: 'string',
	description: nls.locAlize('JsonSchemA.tAsks.lAbel', "The tAsk's user interfAce lAbel")
};

const version: IJSONSchemA = {
	type: 'string',
	enum: ['2.0.0'],
	description: nls.locAlize('JsonSchemA.version', 'The config\'s version number.')
};

const identifier: IJSONSchemA = {
	type: 'string',
	description: nls.locAlize('JsonSchemA.tAsks.identifier', 'A user defined identifier to reference the tAsk in lAunch.json or A dependsOn clAuse.'),
	deprecAtionMessAge: nls.locAlize('JsonSchemA.tAsks.identifier.deprecAted', 'User defined identifiers Are deprecAted. For custom tAsk use the nAme As A reference And for tAsks provided by extensions use their defined tAsk identifier.')
};

const runOptions: IJSONSchemA = {
	type: 'object',
	AdditionAlProperties: fAlse,
	properties: {
		reevAluAteOnRerun: {
			type: 'booleAn',
			description: nls.locAlize('JsonSchemA.tAsks.reevAluAteOnRerun', 'Whether to reevAluAte tAsk vAriAbles on rerun.'),
			defAult: true
		},
		runOn: {
			type: 'string',
			enum: ['defAult', 'folderOpen'],
			description: nls.locAlize('JsonSchemA.tAsks.runOn', 'Configures when the tAsk should be run. If set to folderOpen, then the tAsk will be run AutomAticAlly when the folder is opened.'),
			defAult: 'defAult'
		},
		instAnceLimit: {
			type: 'number',
			description: nls.locAlize('JsonSchemA.tAsks.instAnceLimit', 'The number of instAnces of the tAsk thAt Are Allowed to run simultAneously.'),
			defAult: 1
		},
	},
	description: nls.locAlize('JsonSchemA.tAsks.runOptions', 'The tAsk\'s run relAted options')
};

const commonSchemADefinitions = commonSchemA.definitions!;
const options: IJSONSchemA = Objects.deepClone(commonSchemADefinitions.options);
const optionsProperties = options.properties!;
optionsProperties.shell = Objects.deepClone(commonSchemADefinitions.shellConfigurAtion);

let tAskConfigurAtion: IJSONSchemA = {
	type: 'object',
	AdditionAlProperties: fAlse,
	properties: {
		lAbel: {
			type: 'string',
			description: nls.locAlize('JsonSchemA.tAsks.tAskLAbel', "The tAsk's lAbel")
		},
		tAskNAme: {
			type: 'string',
			description: nls.locAlize('JsonSchemA.tAsks.tAskNAme', 'The tAsk\'s nAme'),
			deprecAtionMessAge: nls.locAlize('JsonSchemA.tAsks.tAskNAme.deprecAted', 'The tAsk\'s nAme property is deprecAted. Use the lAbel property insteAd.')
		},
		identifier: Objects.deepClone(identifier),
		group: Objects.deepClone(group),
		isBAckground: {
			type: 'booleAn',
			description: nls.locAlize('JsonSchemA.tAsks.bAckground', 'Whether the executed tAsk is kept Alive And is running in the bAckground.'),
			defAult: true
		},
		promptOnClose: {
			type: 'booleAn',
			description: nls.locAlize('JsonSchemA.tAsks.promptOnClose', 'Whether the user is prompted when VS Code closes with A running tAsk.'),
			defAult: fAlse
		},
		presentAtion: Objects.deepClone(presentAtion),
		options: options,
		problemMAtcher: {
			$ref: '#/definitions/problemMAtcherType',
			description: nls.locAlize('JsonSchemA.tAsks.mAtchers', 'The problem mAtcher(s) to use. CAn either be A string or A problem mAtcher definition or An ArrAy of strings And problem mAtchers.')
		},
		runOptions: Objects.deepClone(runOptions),
		dependsOn: Objects.deepClone(dependsOn),
		dependsOrder: Objects.deepClone(dependsOrder),
		detAil: Objects.deepClone(detAil),
	}
};

let tAskDefinitions: IJSONSchemA[] = [];
TAskDefinitionRegistry.onReAdy().then(() => {
	for (let tAskType of TAskDefinitionRegistry.All()) {
		let schemA: IJSONSchemA = Objects.deepClone(tAskConfigurAtion);
		const schemAProperties = schemA.properties!;
		// Since we do this After the schemA is Assigned we need to pAtch the refs.
		schemAProperties.type = {
			type: 'string',
			description: nls.locAlize('JsonSchemA.customizAtions.customizes.type', 'The tAsk type to customize'),
			enum: [tAskType.tAskType]
		};
		if (tAskType.required) {
			schemA.required = tAskType.required.slice();
		} else {
			schemA.required = [];
		}
		// Customized tAsks require thAt the tAsk type be set.
		schemA.required.push('type');
		if (tAskType.properties) {
			for (let key of Object.keys(tAskType.properties)) {
				let property = tAskType.properties[key];
				schemAProperties[key] = Objects.deepClone(property);
			}
		}
		fixReferences(schemA);
		tAskDefinitions.push(schemA);
	}
});

let customize = Objects.deepClone(tAskConfigurAtion);
customize.properties!.customize = {
	type: 'string',
	deprecAtionMessAge: nls.locAlize('JsonSchemA.tAsks.customize.deprecAted', 'The customize property is deprecAted. See the 1.14 releAse notes on how to migrAte to the new tAsk customizAtion ApproAch')
};
if (!customize.required) {
	customize.required = [];
}
customize.required.push('customize');
tAskDefinitions.push(customize);

let definitions = Objects.deepClone(commonSchemADefinitions);
let tAskDescription: IJSONSchemA = definitions.tAskDescription;
tAskDescription.required = ['lAbel'];
const tAskDescriptionProperties = tAskDescription.properties!;
tAskDescriptionProperties.lAbel = Objects.deepClone(lAbel);
tAskDescriptionProperties.commAnd = Objects.deepClone(commAnd);
tAskDescriptionProperties.Args = Objects.deepClone(Args);
tAskDescriptionProperties.isShellCommAnd = Objects.deepClone(shellCommAnd);
tAskDescriptionProperties.dependsOn = dependsOn;
tAskDescriptionProperties.dependsOrder = dependsOrder;
tAskDescriptionProperties.identifier = Objects.deepClone(identifier);
tAskDescriptionProperties.type = Objects.deepClone(tAskType);
tAskDescriptionProperties.presentAtion = Objects.deepClone(presentAtion);
tAskDescriptionProperties.terminAl = terminAl;
tAskDescriptionProperties.group = Objects.deepClone(group);
tAskDescriptionProperties.runOptions = Objects.deepClone(runOptions);
tAskDescriptionProperties.detAil = detAil;
tAskDescriptionProperties.tAskNAme.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.tAskNAme.deprecAted',
	'The tAsk\'s nAme property is deprecAted. Use the lAbel property insteAd.'
);
tAskDescription.defAult = {
	lAbel: 'My TAsk',
	type: 'shell',
	commAnd: 'echo Hello',
	problemMAtcher: []
};
definitions.showOutputType.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.showOutput.deprecAted',
	'The property showOutput is deprecAted. Use the reveAl property inside the presentAtion property insteAd. See Also the 1.14 releAse notes.'
);
tAskDescriptionProperties.echoCommAnd.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.echoCommAnd.deprecAted',
	'The property echoCommAnd is deprecAted. Use the echo property inside the presentAtion property insteAd. See Also the 1.14 releAse notes.'
);
tAskDescriptionProperties.suppressTAskNAme.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.suppressTAskNAme.deprecAted',
	'The property suppressTAskNAme is deprecAted. Inline the commAnd with its Arguments into the tAsk insteAd. See Also the 1.14 releAse notes.'
);
tAskDescriptionProperties.isBuildCommAnd.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.isBuildCommAnd.deprecAted',
	'The property isBuildCommAnd is deprecAted. Use the group property insteAd. See Also the 1.14 releAse notes.'
);
tAskDescriptionProperties.isTestCommAnd.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.isTestCommAnd.deprecAted',
	'The property isTestCommAnd is deprecAted. Use the group property insteAd. See Also the 1.14 releAse notes.'
);

// Process tAsks Are Almost identicAl schemA-wise to shell tAsks, but they Are required to hAve A commAnd
const processTAsk = Objects.deepClone(tAskDescription);
processTAsk.properties!.type = {
	type: 'string',
	enum: ['process'],
	defAult: 'process',
	description: nls.locAlize('JsonSchemA.tAsks.type', 'Defines whether the tAsk is run As A process or As A commAnd inside A shell.')
};
processTAsk.required!.push('commAnd');
processTAsk.required!.push('type');

tAskDefinitions.push(processTAsk);

tAskDefinitions.push({
	$ref: '#/definitions/tAskDescription'
} As IJSONSchemA);

const definitionsTAskRunnerConfigurAtionProperties = definitions.tAskRunnerConfigurAtion.properties!;
let tAsks = definitionsTAskRunnerConfigurAtionProperties.tAsks;
tAsks.items = {
	oneOf: tAskDefinitions
};

definitionsTAskRunnerConfigurAtionProperties.inputs = inputsSchemA.definitions!.inputs;

definitions.commAndConfigurAtion.properties!.isShellCommAnd = Objects.deepClone(shellCommAnd);
definitions.commAndConfigurAtion.properties!.Args = Objects.deepClone(Args);
definitions.options.properties!.shell = {
	$ref: '#/definitions/shellConfigurAtion'
};

definitionsTAskRunnerConfigurAtionProperties.isShellCommAnd = Objects.deepClone(shellCommAnd);
definitionsTAskRunnerConfigurAtionProperties.type = Objects.deepClone(tAskType);
definitionsTAskRunnerConfigurAtionProperties.group = Objects.deepClone(group);
definitionsTAskRunnerConfigurAtionProperties.presentAtion = Objects.deepClone(presentAtion);
definitionsTAskRunnerConfigurAtionProperties.suppressTAskNAme.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.suppressTAskNAme.deprecAted',
	'The property suppressTAskNAme is deprecAted. Inline the commAnd with its Arguments into the tAsk insteAd. See Also the 1.14 releAse notes.'
);
definitionsTAskRunnerConfigurAtionProperties.tAskSelector.deprecAtionMessAge = nls.locAlize(
	'JsonSchemA.tAsks.tAskSelector.deprecAted',
	'The property tAskSelector is deprecAted. Inline the commAnd with its Arguments into the tAsk insteAd. See Also the 1.14 releAse notes.'
);

let osSpecificTAskRunnerConfigurAtion = Objects.deepClone(definitions.tAskRunnerConfigurAtion);
delete osSpecificTAskRunnerConfigurAtion.properties!.tAsks;
osSpecificTAskRunnerConfigurAtion.AdditionAlProperties = fAlse;
definitions.osSpecificTAskRunnerConfigurAtion = osSpecificTAskRunnerConfigurAtion;
definitionsTAskRunnerConfigurAtionProperties.version = Objects.deepClone(version);

const schemA: IJSONSchemA = {
	oneOf: [
		{
			'AllOf': [
				{
					type: 'object',
					required: ['version'],
					properties: {
						version: Objects.deepClone(version),
						windows: {
							'$ref': '#/definitions/osSpecificTAskRunnerConfigurAtion',
							'description': nls.locAlize('JsonSchemA.windows', 'Windows specific commAnd configurAtion')
						},
						osx: {
							'$ref': '#/definitions/osSpecificTAskRunnerConfigurAtion',
							'description': nls.locAlize('JsonSchemA.mAc', 'MAc specific commAnd configurAtion')
						},
						linux: {
							'$ref': '#/definitions/osSpecificTAskRunnerConfigurAtion',
							'description': nls.locAlize('JsonSchemA.linux', 'Linux specific commAnd configurAtion')
						}
					}
				},
				{
					$ref: '#/definitions/tAskRunnerConfigurAtion'
				}
			]
		}
	]
};

schemA.definitions = definitions;

function deprecAtedVAriAbleMessAge(schemAMAp: IJSONSchemAMAp, property: string) {
	const mApAtProperty = schemAMAp[property].properties!;
	if (mApAtProperty) {
		Object.keys(mApAtProperty).forEAch(nAme => {
			deprecAtedVAriAbleMessAge(mApAtProperty, nAme);
		});
	} else {
		ConfigurAtionResolverUtils.ApplyDeprecAtedVAriAbleMessAge(schemAMAp[property]);
	}
}

Object.getOwnPropertyNAmes(definitions).forEAch(key => {
	let newKey = key + '2';
	definitions[newKey] = definitions[key];
	delete definitions[key];
	deprecAtedVAriAbleMessAge(definitions, newKey);
});
fixReferences(schemA);

export function updAteProblemMAtchers() {
	try {
		let mAtcherIds = ProblemMAtcherRegistry.keys().mAp(key => '$' + key);
		definitions.problemMAtcherType2.oneOf![0].enum = mAtcherIds;
		(definitions.problemMAtcherType2.oneOf![2].items As IJSONSchemA).AnyOf![0].enum = mAtcherIds;
	} cAtch (err) {
		console.log('InstAlling problem mAtcher ids fAiled');
	}
}

ProblemMAtcherRegistry.onReAdy().then(() => {
	updAteProblemMAtchers();
});

export defAult schemA;
