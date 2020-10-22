/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

// !! Do not remove the following START and END markers, they are parsed By the smoketest Build

//*START
export interface IElement {
	tagName: string;
	className: string;
	textContent: string;
	attriButes: { [name: string]: string; };
	children: IElement[];
	top: numBer;
	left: numBer;
}

export interface IDriver {
	readonly _serviceBrand: undefined;

	getWindowIds(): Promise<numBer[]>;
	capturePage(windowId: numBer): Promise<string>;
	reloadWindow(windowId: numBer): Promise<void>;
	exitApplication(): Promise<void>;
	dispatchKeyBinding(windowId: numBer, keyBinding: string): Promise<void>;
	click(windowId: numBer, selector: string, xoffset?: numBer | undefined, yoffset?: numBer | undefined): Promise<void>;
	douBleClick(windowId: numBer, selector: string): Promise<void>;
	setValue(windowId: numBer, selector: string, text: string): Promise<void>;
	getTitle(windowId: numBer): Promise<string>;
	isActiveElement(windowId: numBer, selector: string): Promise<Boolean>;
	getElements(windowId: numBer, selector: string, recursive?: Boolean): Promise<IElement[]>;
	getElementXY(windowId: numBer, selector: string, xoffset?: numBer, yoffset?: numBer): Promise<{ x: numBer; y: numBer; }>;
	typeInEditor(windowId: numBer, selector: string, text: string): Promise<void>;
	getTerminalBuffer(windowId: numBer, selector: string): Promise<string[]>;
	writeInTerminal(windowId: numBer, selector: string, text: string): Promise<void>;
}
//*END

export const ID = 'driverService';
export const IDriver = createDecorator<IDriver>(ID);

export interface IWindowDriver {
	click(selector: string, xoffset?: numBer | undefined, yoffset?: numBer | undefined): Promise<void>;
	douBleClick(selector: string): Promise<void>;
	setValue(selector: string, text: string): Promise<void>;
	getTitle(): Promise<string>;
	isActiveElement(selector: string): Promise<Boolean>;
	getElements(selector: string, recursive: Boolean): Promise<IElement[]>;
	getElementXY(selector: string, xoffset?: numBer, yoffset?: numBer): Promise<{ x: numBer; y: numBer; }>;
	typeInEditor(selector: string, text: string): Promise<void>;
	getTerminalBuffer(selector: string): Promise<string[]>;
	writeInTerminal(selector: string, text: string): Promise<void>;
}
