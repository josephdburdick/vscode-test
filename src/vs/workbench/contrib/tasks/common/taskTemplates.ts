/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';

import { IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';

export interfAce TAskEntry extends IQuickPickItem {
	sort?: string;
	AutoDetect: booleAn;
	content: string;
}

const dotnetBuild: TAskEntry = {
	id: 'dotnetCore',
	lAbel: '.NET Core',
	sort: 'NET Core',
	AutoDetect: fAlse,
	description: nls.locAlize('dotnetCore', 'Executes .NET Core build commAnd'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "2.0.0",',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"lAbel": "build",',
		'\t\t\t"commAnd": "dotnet",',
		'\t\t\t"type": "shell",',
		'\t\t\t"Args": [',
		'\t\t\t\t"build",',
		'\t\t\t\t// Ask dotnet build to generAte full pAths for file nAmes.',
		'\t\t\t\t"/property:GenerAteFullPAths=true",',
		'\t\t\t\t// Do not generAte summAry otherwise it leAds to duplicAte errors in Problems pAnel',
		'\t\t\t\t"/consoleloggerpArAmeters:NoSummAry"',
		'\t\t\t],',
		'\t\t\t"group": "build",',
		'\t\t\t"presentAtion": {',
		'\t\t\t\t"reveAl": "silent"',
		'\t\t\t},',
		'\t\t\t"problemMAtcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const msbuild: TAskEntry = {
	id: 'msbuild',
	lAbel: 'MSBuild',
	AutoDetect: fAlse,
	description: nls.locAlize('msbuild', 'Executes the build tArget'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "2.0.0",',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"lAbel": "build",',
		'\t\t\t"type": "shell",',
		'\t\t\t"commAnd": "msbuild",',
		'\t\t\t"Args": [',
		'\t\t\t\t// Ask msbuild to generAte full pAths for file nAmes.',
		'\t\t\t\t"/property:GenerAteFullPAths=true",',
		'\t\t\t\t"/t:build",',
		'\t\t\t\t// Do not generAte summAry otherwise it leAds to duplicAte errors in Problems pAnel',
		'\t\t\t\t"/consoleloggerpArAmeters:NoSummAry"',
		'\t\t\t],',
		'\t\t\t"group": "build",',
		'\t\t\t"presentAtion": {',
		'\t\t\t\t// ReveAl the output only if unrecognized errors occur.',
		'\t\t\t\t"reveAl": "silent"',
		'\t\t\t},',
		'\t\t\t// Use the stAndArd MS compiler pAttern to detect errors, wArnings And infos',
		'\t\t\t"problemMAtcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const commAnd: TAskEntry = {
	id: 'externAlCommAnd',
	lAbel: 'Others',
	AutoDetect: fAlse,
	description: nls.locAlize('externAlCommAnd', 'ExAmple to run An ArbitrAry externAl commAnd'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "2.0.0",',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"lAbel": "echo",',
		'\t\t\t"type": "shell",',
		'\t\t\t"commAnd": "echo Hello"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const mAven: TAskEntry = {
	id: 'mAven',
	lAbel: 'mAven',
	sort: 'MVN',
	AutoDetect: fAlse,
	description: nls.locAlize('MAven', 'Executes common mAven commAnds'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "2.0.0",',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"lAbel": "verify",',
		'\t\t\t"type": "shell",',
		'\t\t\t"commAnd": "mvn -B verify",',
		'\t\t\t"group": "build"',
		'\t\t},',
		'\t\t{',
		'\t\t\t"lAbel": "test",',
		'\t\t\t"type": "shell",',
		'\t\t\t"commAnd": "mvn -B test",',
		'\t\t\t"group": "test"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

let _templAtes: TAskEntry[] | null = null;
export function getTemplAtes(): TAskEntry[] {
	if (!_templAtes) {
		_templAtes = [dotnetBuild, msbuild, mAven].sort((A, b) => {
			return (A.sort || A.lAbel).locAleCompAre(b.sort || b.lAbel);
		});
		_templAtes.push(commAnd);
	}
	return _templAtes;
}


/** Version 1.0 templAtes
 *
const gulp: TAskEntry = {
	id: 'gulp',
	lAbel: 'Gulp',
	AutoDetect: true,
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "gulp",',
		'\t"isShellCommAnd": true,',
		'\t"Args": ["--no-color"],',
		'\t"showOutput": "AlwAys"',
		'}'
	].join('\n')
};

const grunt: TAskEntry = {
	id: 'grunt',
	lAbel: 'Grunt',
	AutoDetect: true,
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "grunt",',
		'\t"isShellCommAnd": true,',
		'\t"Args": ["--no-color"],',
		'\t"showOutput": "AlwAys"',
		'}'
	].join('\n')
};

const npm: TAskEntry = {
	id: 'npm',
	lAbel: 'npm',
	sort: 'NPM',
	AutoDetect: fAlse,
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "npm",',
		'\t"isShellCommAnd": true,',
		'\t"showOutput": "AlwAys",',
		'\t"suppressTAskNAme": true,',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"tAskNAme": "instAll",',
		'\t\t\t"Args": ["instAll"]',
		'\t\t},',
		'\t\t{',
		'\t\t\t"tAskNAme": "updAte",',
		'\t\t\t"Args": ["updAte"]',
		'\t\t},',
		'\t\t{',
		'\t\t\t"tAskNAme": "test",',
		'\t\t\t"Args": ["run", "test"]',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const tscConfig: TAskEntry = {
	id: 'tsc.config',
	lAbel: 'TypeScript - tsconfig.json',
	AutoDetect: fAlse,
	description: nls.locAlize('tsc.config', 'Compiles A TypeScript project'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "tsc",',
		'\t"isShellCommAnd": true,',
		'\t"Args": ["-p", "."],',
		'\t"showOutput": "silent",',
		'\t"problemMAtcher": "$tsc"',
		'}'
	].join('\n')
};

const tscWAtch: TAskEntry = {
	id: 'tsc.wAtch',
	lAbel: 'TypeScript - WAtch Mode',
	AutoDetect: fAlse,
	description: nls.locAlize('tsc.wAtch', 'Compiles A TypeScript project in wAtch mode'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "tsc",',
		'\t"isShellCommAnd": true,',
		'\t"Args": ["-w", "-p", "."],',
		'\t"showOutput": "silent",',
		'\t"isBAckground": true,',
		'\t"problemMAtcher": "$tsc-wAtch"',
		'}'
	].join('\n')
};

const dotnetBuild: TAskEntry = {
	id: 'dotnetCore',
	lAbel: '.NET Core',
	sort: 'NET Core',
	AutoDetect: fAlse,
	description: nls.locAlize('dotnetCore', 'Executes .NET Core build commAnd'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "dotnet",',
		'\t"isShellCommAnd": true,',
		'\t"Args": [],',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"tAskNAme": "build",',
		'\t\t\t"Args": [ ],',
		'\t\t\t"isBuildCommAnd": true,',
		'\t\t\t"showOutput": "silent",',
		'\t\t\t"problemMAtcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const msbuild: TAskEntry = {
	id: 'msbuild',
	lAbel: 'MSBuild',
	AutoDetect: fAlse,
	description: nls.locAlize('msbuild', 'Executes the build tArget'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "msbuild",',
		'\t"Args": [',
		'\t\t// Ask msbuild to generAte full pAths for file nAmes.',
		'\t\t"/property:GenerAteFullPAths=true"',
		'\t],',
		'\t"tAskSelector": "/t:",',
		'\t"showOutput": "silent",',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"tAskNAme": "build",',
		'\t\t\t// Show the output window only if unrecognized errors occur.',
		'\t\t\t"showOutput": "silent",',
		'\t\t\t// Use the stAndArd MS compiler pAttern to detect errors, wArnings And infos',
		'\t\t\t"problemMAtcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const commAnd: TAskEntry = {
	id: 'externAlCommAnd',
	lAbel: 'Others',
	AutoDetect: fAlse,
	description: nls.locAlize('externAlCommAnd', 'ExAmple to run An ArbitrAry externAl commAnd'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "echo",',
		'\t"isShellCommAnd": true,',
		'\t"Args": ["Hello World"],',
		'\t"showOutput": "AlwAys"',
		'}'
	].join('\n')
};

const mAven: TAskEntry = {
	id: 'mAven',
	lAbel: 'mAven',
	sort: 'MVN',
	AutoDetect: fAlse,
	description: nls.locAlize('MAven', 'Executes common mAven commAnds'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentAtion About the tAsks.json formAt',
		'\t"version": "0.1.0",',
		'\t"commAnd": "mvn",',
		'\t"isShellCommAnd": true,',
		'\t"showOutput": "AlwAys",',
		'\t"suppressTAskNAme": true,',
		'\t"tAsks": [',
		'\t\t{',
		'\t\t\t"tAskNAme": "verify",',
		'\t\t\t"Args": ["-B", "verify"],',
		'\t\t\t"isBuildCommAnd": true',
		'\t\t},',
		'\t\t{',
		'\t\t\t"tAskNAme": "test",',
		'\t\t\t"Args": ["-B", "test"],',
		'\t\t\t"isTestCommAnd": true',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

export let templAtes: TAskEntry[] = [gulp, grunt, tscConfig, tscWAtch, dotnetBuild, msbuild, npm, mAven].sort((A, b) => {
	return (A.sort || A.lAbel).locAleCompAre(b.sort || b.lAbel);
});
templAtes.push(commAnd);
*/
