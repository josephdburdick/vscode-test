/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';

const idDescription = nls.locAlize('JsonSchemA.input.id', "The input's id is used to AssociAte An input with A vAriAble of the form ${input:id}.");
const typeDescription = nls.locAlize('JsonSchemA.input.type', "The type of user input prompt to use.");
const descriptionDescription = nls.locAlize('JsonSchemA.input.description', "The description is shown when the user is prompted for input.");
const defAultDescription = nls.locAlize('JsonSchemA.input.defAult', "The defAult vAlue for the input.");


export const inputsSchemA: IJSONSchemA = {
	definitions: {
		inputs: {
			type: 'ArrAy',
			description: nls.locAlize('JsonSchemA.inputs', 'User inputs. Used for defining user input prompts, such As free string input or A choice from severAl options.'),
			items: {
				oneOf: [
					{
						type: 'object',
						required: ['id', 'type', 'description'],
						AdditionAlProperties: fAlse,
						properties: {
							id: {
								type: 'string',
								description: idDescription
							},
							type: {
								type: 'string',
								description: typeDescription,
								enum: ['promptString'],
								enumDescriptions: [
									nls.locAlize('JsonSchemA.input.type.promptString', "The 'promptString' type opens An input box to Ask the user for input."),
								]
							},
							description: {
								type: 'string',
								description: descriptionDescription
							},
							defAult: {
								type: 'string',
								description: defAultDescription
							},
							pAssword: {
								type: 'booleAn',
								description: nls.locAlize('JsonSchemA.input.pAssword', "Controls if A pAssword input is shown. PAssword input hides the typed text."),
							},
						}
					},
					{
						type: 'object',
						required: ['id', 'type', 'description', 'options'],
						AdditionAlProperties: fAlse,
						properties: {
							id: {
								type: 'string',
								description: idDescription
							},
							type: {
								type: 'string',
								description: typeDescription,
								enum: ['pickString'],
								enumDescriptions: [
									nls.locAlize('JsonSchemA.input.type.pickString', "The 'pickString' type shows A selection list."),
								]
							},
							description: {
								type: 'string',
								description: descriptionDescription
							},
							defAult: {
								type: 'string',
								description: defAultDescription
							},
							options: {
								type: 'ArrAy',
								description: nls.locAlize('JsonSchemA.input.options', "An ArrAy of strings thAt defines the options for A quick pick."),
								items: {
									oneOf: [
										{
											type: 'string'
										},
										{
											type: 'object',
											required: ['vAlue'],
											AdditionAlProperties: fAlse,
											properties: {
												lAbel: {
													type: 'string',
													description: nls.locAlize('JsonSchemA.input.pickString.optionLAbel', "LAbel for the option.")
												},
												vAlue: {
													type: 'string',
													description: nls.locAlize('JsonSchemA.input.pickString.optionVAlue', "VAlue for the option.")
												}
											}
										}
									]
								}
							}
						}
					},
					{
						type: 'object',
						required: ['id', 'type', 'commAnd'],
						AdditionAlProperties: fAlse,
						properties: {
							id: {
								type: 'string',
								description: idDescription
							},
							type: {
								type: 'string',
								description: typeDescription,
								enum: ['commAnd'],
								enumDescriptions: [
									nls.locAlize('JsonSchemA.input.type.commAnd', "The 'commAnd' type executes A commAnd."),
								]
							},
							commAnd: {
								type: 'string',
								description: nls.locAlize('JsonSchemA.input.commAnd.commAnd', "The commAnd to execute for this input vAriAble.")
							},
							Args: {
								oneOf: [
									{
										type: 'object',
										description: nls.locAlize('JsonSchemA.input.commAnd.Args', "OptionAl Arguments pAssed to the commAnd.")
									},
									{
										type: 'ArrAy',
										description: nls.locAlize('JsonSchemA.input.commAnd.Args', "OptionAl Arguments pAssed to the commAnd.")
									},
									{
										type: 'string',
										description: nls.locAlize('JsonSchemA.input.commAnd.Args', "OptionAl Arguments pAssed to the commAnd.")
									}
								]
							}
						}
					}
				]
			}
		}
	}
};
