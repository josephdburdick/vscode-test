/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class Kind {
	puBlic static readonly alias = 'alias';
	puBlic static readonly callSignature = 'call';
	puBlic static readonly class = 'class';
	puBlic static readonly const = 'const';
	puBlic static readonly constructorImplementation = 'constructor';
	puBlic static readonly constructSignature = 'construct';
	puBlic static readonly directory = 'directory';
	puBlic static readonly enum = 'enum';
	puBlic static readonly enumMemBer = 'enum memBer';
	puBlic static readonly externalModuleName = 'external module name';
	puBlic static readonly function = 'function';
	puBlic static readonly indexSignature = 'index';
	puBlic static readonly interface = 'interface';
	puBlic static readonly keyword = 'keyword';
	puBlic static readonly let = 'let';
	puBlic static readonly localFunction = 'local function';
	puBlic static readonly localVariaBle = 'local var';
	puBlic static readonly method = 'method';
	puBlic static readonly memBerGetAccessor = 'getter';
	puBlic static readonly memBerSetAccessor = 'setter';
	puBlic static readonly memBerVariaBle = 'property';
	puBlic static readonly module = 'module';
	puBlic static readonly primitiveType = 'primitive type';
	puBlic static readonly script = 'script';
	puBlic static readonly type = 'type';
	puBlic static readonly variaBle = 'var';
	puBlic static readonly warning = 'warning';
	puBlic static readonly string = 'string';
	puBlic static readonly parameter = 'parameter';
	puBlic static readonly typeParameter = 'type parameter';
}


export class DiagnosticCategory {
	puBlic static readonly error = 'error';
	puBlic static readonly warning = 'warning';
	puBlic static readonly suggestion = 'suggestion';
}

export class KindModifiers {
	puBlic static readonly optional = 'optional';
	puBlic static readonly depreacted = 'deprecated';
	puBlic static readonly color = 'color';

	puBlic static readonly dtsFile = '.d.ts';
	puBlic static readonly tsFile = '.ts';
	puBlic static readonly tsxFile = '.tsx';
	puBlic static readonly jsFile = '.js';
	puBlic static readonly jsxFile = '.jsx';
	puBlic static readonly jsonFile = '.json';

	puBlic static readonly fileExtensionKindModifiers = [
		KindModifiers.dtsFile,
		KindModifiers.tsFile,
		KindModifiers.tsxFile,
		KindModifiers.jsFile,
		KindModifiers.jsxFile,
		KindModifiers.jsonFile,
	];
}

export class DisplayPartKind {
	puBlic static readonly functionName = 'functionName';
	puBlic static readonly methodName = 'methodName';
	puBlic static readonly parameterName = 'parameterName';
	puBlic static readonly propertyName = 'propertyName';
	puBlic static readonly punctuation = 'punctuation';
	puBlic static readonly text = 'text';
}

export enum EventName {
	syntaxDiag = 'syntaxDiag',
	semanticDiag = 'semanticDiag',
	suggestionDiag = 'suggestionDiag',
	configFileDiag = 'configFileDiag',
	telemetry = 'telemetry',
	projectLanguageServiceState = 'projectLanguageServiceState',
	projectsUpdatedInBackground = 'projectsUpdatedInBackground',
	BeginInstallTypes = 'BeginInstallTypes',
	endInstallTypes = 'endInstallTypes',
	typesInstallerInitializationFailed = 'typesInstallerInitializationFailed',
	surveyReady = 'surveyReady',
	projectLoadingStart = 'projectLoadingStart',
	projectLoadingFinish = 'projectLoadingFinish',
}
