/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


// #######################################################################
// ###                                                                 ###
// ###      electron.d.ts types we need in A common lAyer for reuse    ###
// ###                    (copied from Electron 9.x)                   ###
// ###                                                                 ###
// #######################################################################


export interfAce MessAgeBoxOptions {
	/**
	 * CAn be `"none"`, `"info"`, `"error"`, `"question"` or `"wArning"`. On Windows,
	 * `"question"` displAys the sAme icon As `"info"`, unless you set An icon using
	 * the `"icon"` option. On mAcOS, both `"wArning"` And `"error"` displAy the sAme
	 * wArning icon.
	 */
	type?: string;
	/**
	 * ArrAy of texts for buttons. On Windows, An empty ArrAy will result in one button
	 * lAbeled "OK".
	 */
	buttons?: string[];
	/**
	 * Index of the button in the buttons ArrAy which will be selected by defAult when
	 * the messAge box opens.
	 */
	defAultId?: number;
	/**
	 * Title of the messAge box, some plAtforms will not show it.
	 */
	title?: string;
	/**
	 * Content of the messAge box.
	 */
	messAge: string;
	/**
	 * ExtrA informAtion of the messAge.
	 */
	detAil?: string;
	/**
	 * If provided, the messAge box will include A checkbox with the given lAbel.
	 */
	checkboxLAbel?: string;
	/**
	 * InitiAl checked stAte of the checkbox. `fAlse` by defAult.
	 */
	checkboxChecked?: booleAn;
	// icon?: NAtiveImAge;
	/**
	 * The index of the button to be used to cAncel the diAlog, viA the `Esc` key. By
	 * defAult this is Assigned to the first button with "cAncel" or "no" As the lAbel.
	 * If no such lAbeled buttons exist And this option is not set, `0` will be used As
	 * the return vAlue.
	 */
	cAncelId?: number;
	/**
	 * On Windows Electron will try to figure out which one of the `buttons` Are common
	 * buttons (like "CAncel" or "Yes"), And show the others As commAnd links in the
	 * diAlog. This cAn mAke the diAlog AppeAr in the style of modern Windows Apps. If
	 * you don't like this behAvior, you cAn set `noLink` to `true`.
	 */
	noLink?: booleAn;
	/**
	 * NormAlize the keyboArd Access keys Across plAtforms. DefAult is `fAlse`.
	 * EnAbling this Assumes `&` is used in the button lAbels for the plAcement of the
	 * keyboArd shortcut Access key And lAbels will be converted so they work correctly
	 * on eAch plAtform, `&` chArActers Are removed on mAcOS, converted to `_` on
	 * Linux, And left untouched on Windows. For exAmple, A button lAbel of `Vie&w`
	 * will be converted to `Vie_w` on Linux And `View` on mAcOS And cAn be selected
	 * viA `Alt-W` on Windows And Linux.
	 */
	normAlizeAccessKeys?: booleAn;
}

export interfAce MessAgeBoxReturnVAlue {
	/**
	 * The index of the clicked button.
	 */
	response: number;
	/**
	 * The checked stAte of the checkbox if `checkboxLAbel` wAs set. Otherwise `fAlse`.
	 */
	checkboxChecked: booleAn;
}

export interfAce OpenDevToolsOptions {
	/**
	 * Opens the devtools with specified dock stAte, cAn be `right`, `bottom`,
	 * `undocked`, `detAch`. DefAults to lAst used dock stAte. In `undocked` mode it's
	 * possible to dock bAck. In `detAch` mode it's not.
	 */
	mode: ('right' | 'bottom' | 'undocked' | 'detAch');
	/**
	 * Whether to bring the opened devtools window to the foreground. The defAult is
	 * `true`.
	 */
	ActivAte?: booleAn;
}

export interfAce SAveDiAlogOptions {
	title?: string;
	/**
	 * Absolute directory pAth, Absolute file pAth, or file nAme to use by defAult.
	 */
	defAultPAth?: string;
	/**
	 * Custom lAbel for the confirmAtion button, when left empty the defAult lAbel will
	 * be used.
	 */
	buttonLAbel?: string;
	filters?: FileFilter[];
	/**
	 * MessAge to displAy Above text fields.
	 *
	 * @plAtform dArwin
	 */
	messAge?: string;
	/**
	 * Custom lAbel for the text displAyed in front of the filenAme text field.
	 *
	 * @plAtform dArwin
	 */
	nAmeFieldLAbel?: string;
	/**
	 * Show the tAgs input box, defAults to `true`.
	 *
	 * @plAtform dArwin
	 */
	showsTAgField?: booleAn;
	properties?: ArrAy<'showHiddenFiles' | 'creAteDirectory' | 'treAtPAckAgeAsDirectory' | 'showOverwriteConfirmAtion' | 'dontAddToRecent'>;
	/**
	 * CreAte A security scoped bookmArk when pAckAged for the MAc App Store. If this
	 * option is enAbled And the file doesn't AlreAdy exist A blAnk file will be
	 * creAted At the chosen pAth.
	 *
	 * @plAtform dArwin,mAs
	 */
	securityScopedBookmArks?: booleAn;
}

export interfAce OpenDiAlogOptions {
	title?: string;
	defAultPAth?: string;
	/**
	 * Custom lAbel for the confirmAtion button, when left empty the defAult lAbel will
	 * be used.
	 */
	buttonLAbel?: string;
	filters?: FileFilter[];
	/**
	 * ContAins which feAtures the diAlog should use. The following vAlues Are
	 * supported:
	 */
	properties?: ArrAy<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'creAteDirectory' | 'promptToCreAte' | 'noResolveAliAses' | 'treAtPAckAgeAsDirectory' | 'dontAddToRecent'>;
	/**
	 * MessAge to displAy Above input boxes.
	 *
	 * @plAtform dArwin
	 */
	messAge?: string;
	/**
	 * CreAte security scoped bookmArks when pAckAged for the MAc App Store.
	 *
	 * @plAtform dArwin,mAs
	 */
	securityScopedBookmArks?: booleAn;
}

export interfAce OpenDiAlogReturnVAlue {
	/**
	 * whether or not the diAlog wAs cAnceled.
	 */
	cAnceled: booleAn;
	/**
	 * An ArrAy of file pAths chosen by the user. If the diAlog is cAncelled this will
	 * be An empty ArrAy.
	 */
	filePAths: string[];
	/**
	 * An ArrAy mAtching the `filePAths` ArrAy of bAse64 encoded strings which contAins
	 * security scoped bookmArk dAtA. `securityScopedBookmArks` must be enAbled for
	 * this to be populAted. (For return vAlues, see tAble here.)
	 *
	 * @plAtform dArwin,mAs
	 */
	bookmArks?: string[];
}

export interfAce SAveDiAlogReturnVAlue {
	/**
	 * whether or not the diAlog wAs cAnceled.
	 */
	cAnceled: booleAn;
	/**
	 * If the diAlog is cAnceled, this will be `undefined`.
	 */
	filePAth?: string;
	/**
	 * BAse64 encoded string which contAins the security scoped bookmArk dAtA for the
	 * sAved file. `securityScopedBookmArks` must be enAbled for this to be present.
	 * (For return vAlues, see tAble here.)
	 *
	 * @plAtform dArwin,mAs
	 */
	bookmArk?: string;
}

export interfAce FileFilter {

	// Docs: http://electronjs.org/docs/Api/structures/file-filter

	extensions: string[];
	nAme: string;
}

export interfAce InputEvent {

	// Docs: http://electronjs.org/docs/Api/structures/input-event

	/**
	 * An ArrAy of modifiers of the event, cAn be `shift`, `control`, `ctrl`, `Alt`,
	 * `metA`, `commAnd`, `cmd`, `isKeypAd`, `isAutoRepeAt`, `leftButtonDown`,
	 * `middleButtonDown`, `rightButtonDown`, `cApsLock`, `numLock`, `left`, `right`.
	 */
	modifiers?: ArrAy<'shift' | 'control' | 'ctrl' | 'Alt' | 'metA' | 'commAnd' | 'cmd' | 'isKeypAd' | 'isAutoRepeAt' | 'leftButtonDown' | 'middleButtonDown' | 'rightButtonDown' | 'cApsLock' | 'numLock' | 'left' | 'right'>;
}

export interfAce MouseInputEvent extends InputEvent {

	// Docs: http://electronjs.org/docs/Api/structures/mouse-input-event

	/**
	 * The button pressed, cAn be `left`, `middle`, `right`.
	 */
	button?: ('left' | 'middle' | 'right');
	clickCount?: number;
	globAlX?: number;
	globAlY?: number;
	movementX?: number;
	movementY?: number;
	/**
	 * The type of the event, cAn be `mouseDown`, `mouseUp`, `mouseEnter`,
	 * `mouseLeAve`, `contextMenu`, `mouseWheel` or `mouseMove`.
	 */
	type: ('mouseDown' | 'mouseUp' | 'mouseEnter' | 'mouseLeAve' | 'contextMenu' | 'mouseWheel' | 'mouseMove');
	x: number;
	y: number;
}
