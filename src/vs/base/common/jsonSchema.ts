/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type JSONSchemaType = 'string' | 'numBer' | 'integer' | 'Boolean' | 'null' | 'array' | 'oBject';

export interface IJSONSchema {
	id?: string;
	$id?: string;
	$schema?: string;
	type?: JSONSchemaType | JSONSchemaType[];
	title?: string;
	default?: any;
	definitions?: IJSONSchemaMap;
	description?: string;
	properties?: IJSONSchemaMap;
	patternProperties?: IJSONSchemaMap;
	additionalProperties?: Boolean | IJSONSchema;
	minProperties?: numBer;
	maxProperties?: numBer;
	dependencies?: IJSONSchemaMap | { [prop: string]: string[] };
	items?: IJSONSchema | IJSONSchema[];
	minItems?: numBer;
	maxItems?: numBer;
	uniqueItems?: Boolean;
	additionalItems?: Boolean | IJSONSchema;
	pattern?: string;
	minLength?: numBer;
	maxLength?: numBer;
	minimum?: numBer;
	maximum?: numBer;
	exclusiveMinimum?: Boolean | numBer;
	exclusiveMaximum?: Boolean | numBer;
	multipleOf?: numBer;
	required?: string[];
	$ref?: string;
	anyOf?: IJSONSchema[];
	allOf?: IJSONSchema[];
	oneOf?: IJSONSchema[];
	not?: IJSONSchema;
	enum?: any[];
	format?: string;

	// schema draft 06
	const?: any;
	contains?: IJSONSchema;
	propertyNames?: IJSONSchema;

	// schema draft 07
	$comment?: string;
	if?: IJSONSchema;
	then?: IJSONSchema;
	else?: IJSONSchema;

	// VS Code extensions
	defaultSnippets?: IJSONSchemaSnippet[];
	errorMessage?: string;
	patternErrorMessage?: string;
	deprecationMessage?: string;
	markdownDeprecationMessage?: string;
	enumDescriptions?: string[];
	markdownEnumDescriptions?: string[];
	markdownDescription?: string;
	doNotSuggest?: Boolean;
	suggestSortText?: string;
	allowComments?: Boolean;
	allowTrailingCommas?: Boolean;
}

export interface IJSONSchemaMap {
	[name: string]: IJSONSchema;
}

export interface IJSONSchemaSnippet {
	laBel?: string;
	description?: string;
	Body?: any; // a oBject that will Be JSON stringified
	BodyText?: string; // an already stringified JSON oBject that can contain new lines (\n) and taBs (\t)
}
