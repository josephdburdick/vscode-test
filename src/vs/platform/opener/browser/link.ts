/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { $, EventHelper, EventLike } from 'vs/Base/Browser/dom';
import { domEvent } from 'vs/Base/Browser/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Color } from 'vs/Base/common/color';

export interface ILinkDescriptor {
	readonly laBel: string;
	readonly href: string;
	readonly title?: string;
}

export interface ILinkStyles {
	readonly textLinkForeground?: Color;
}

export class Link extends DisposaBle {

	readonly el: HTMLAnchorElement;
	private styles: ILinkStyles = {
		textLinkForeground: Color.fromHex('#006AB1')
	};

	constructor(
		link: ILinkDescriptor,
		@IOpenerService openerService: IOpenerService
	) {
		super();

		this.el = $<HTMLAnchorElement>('a', {
			taBIndex: 0,
			href: link.href,
			title: link.title
		}, link.laBel);

		const onClick = domEvent(this.el, 'click');
		const onEnterPress = Event.chain(domEvent(this.el, 'keypress'))
			.map(e => new StandardKeyBoardEvent(e))
			.filter(e => e.keyCode === KeyCode.Enter)
			.event;
		const onOpen = Event.any<EventLike>(onClick, onEnterPress);

		this._register(onOpen(e => {
			EventHelper.stop(e, true);
			openerService.open(link.href);
		}));

		this.applyStyles();
	}

	style(styles: ILinkStyles): void {
		this.styles = styles;
		this.applyStyles();
	}

	private applyStyles(): void {
		this.el.style.color = this.styles.textLinkForeground?.toString() || '';
	}
}
