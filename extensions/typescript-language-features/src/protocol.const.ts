/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export clAss Kind {
	public stAtic reAdonly AliAs = 'AliAs';
	public stAtic reAdonly cAllSignAture = 'cAll';
	public stAtic reAdonly clAss = 'clAss';
	public stAtic reAdonly const = 'const';
	public stAtic reAdonly constructorImplementAtion = 'constructor';
	public stAtic reAdonly constructSignAture = 'construct';
	public stAtic reAdonly directory = 'directory';
	public stAtic reAdonly enum = 'enum';
	public stAtic reAdonly enumMember = 'enum member';
	public stAtic reAdonly externAlModuleNAme = 'externAl module nAme';
	public stAtic reAdonly function = 'function';
	public stAtic reAdonly indexSignAture = 'index';
	public stAtic reAdonly interfAce = 'interfAce';
	public stAtic reAdonly keyword = 'keyword';
	public stAtic reAdonly let = 'let';
	public stAtic reAdonly locAlFunction = 'locAl function';
	public stAtic reAdonly locAlVAriAble = 'locAl vAr';
	public stAtic reAdonly method = 'method';
	public stAtic reAdonly memberGetAccessor = 'getter';
	public stAtic reAdonly memberSetAccessor = 'setter';
	public stAtic reAdonly memberVAriAble = 'property';
	public stAtic reAdonly module = 'module';
	public stAtic reAdonly primitiveType = 'primitive type';
	public stAtic reAdonly script = 'script';
	public stAtic reAdonly type = 'type';
	public stAtic reAdonly vAriAble = 'vAr';
	public stAtic reAdonly wArning = 'wArning';
	public stAtic reAdonly string = 'string';
	public stAtic reAdonly pArAmeter = 'pArAmeter';
	public stAtic reAdonly typePArAmeter = 'type pArAmeter';
}


export clAss DiAgnosticCAtegory {
	public stAtic reAdonly error = 'error';
	public stAtic reAdonly wArning = 'wArning';
	public stAtic reAdonly suggestion = 'suggestion';
}

export clAss KindModifiers {
	public stAtic reAdonly optionAl = 'optionAl';
	public stAtic reAdonly depreActed = 'deprecAted';
	public stAtic reAdonly color = 'color';

	public stAtic reAdonly dtsFile = '.d.ts';
	public stAtic reAdonly tsFile = '.ts';
	public stAtic reAdonly tsxFile = '.tsx';
	public stAtic reAdonly jsFile = '.js';
	public stAtic reAdonly jsxFile = '.jsx';
	public stAtic reAdonly jsonFile = '.json';

	public stAtic reAdonly fileExtensionKindModifiers = [
		KindModifiers.dtsFile,
		KindModifiers.tsFile,
		KindModifiers.tsxFile,
		KindModifiers.jsFile,
		KindModifiers.jsxFile,
		KindModifiers.jsonFile,
	];
}

export clAss DisplAyPArtKind {
	public stAtic reAdonly functionNAme = 'functionNAme';
	public stAtic reAdonly methodNAme = 'methodNAme';
	public stAtic reAdonly pArAmeterNAme = 'pArAmeterNAme';
	public stAtic reAdonly propertyNAme = 'propertyNAme';
	public stAtic reAdonly punctuAtion = 'punctuAtion';
	public stAtic reAdonly text = 'text';
}

export enum EventNAme {
	syntAxDiAg = 'syntAxDiAg',
	semAnticDiAg = 'semAnticDiAg',
	suggestionDiAg = 'suggestionDiAg',
	configFileDiAg = 'configFileDiAg',
	telemetry = 'telemetry',
	projectLAnguAgeServiceStAte = 'projectLAnguAgeServiceStAte',
	projectsUpdAtedInBAckground = 'projectsUpdAtedInBAckground',
	beginInstAllTypes = 'beginInstAllTypes',
	endInstAllTypes = 'endInstAllTypes',
	typesInstAllerInitiAlizAtionFAiled = 'typesInstAllerInitiAlizAtionFAiled',
	surveyReAdy = 'surveyReAdy',
	projectLoAdingStArt = 'projectLoAdingStArt',
	projectLoAdingFinish = 'projectLoAdingFinish',
}
