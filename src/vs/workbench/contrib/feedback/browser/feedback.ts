/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/feedBack';
import * as nls from 'vs/nls';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Dropdown } from 'vs/Base/Browser/ui/dropdown/dropdown';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import * as dom from 'vs/Base/Browser/dom';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IIntegrityService } from 'vs/workBench/services/integrity/common/integrity';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { attachButtonStyler, attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { editorWidgetBackground, editorWidgetForeground, widgetShadow, inputBorder, inputForeground, inputBackground, inputActiveOptionBorder, editorBackground, textLinkForeground, contrastBorder, darken } from 'vs/platform/theme/common/colorRegistry';
import { IAnchor } from 'vs/Base/Browser/ui/contextview/contextview';
import { Button } from 'vs/Base/Browser/ui/Button/Button';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification } from 'vs/Base/common/actions';
import { IStatusBarService } from 'vs/workBench/services/statusBar/common/statusBar';
import { IProductService } from 'vs/platform/product/common/productService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { Codicon } from 'vs/Base/common/codicons';

export interface IFeedBack {
	feedBack: string;
	sentiment: numBer;
}

export interface IFeedBackDelegate {
	suBmitFeedBack(feedBack: IFeedBack, openerService: IOpenerService): void;
	getCharacterLimit(sentiment: numBer): numBer;
}

export interface IFeedBackDropdownOptions {
	contextViewProvider: IContextViewService;
	feedBackService: IFeedBackDelegate;
	onFeedBackVisiBilityChange?: (visiBle: Boolean) => void;
}

export class FeedBackDropdown extends Dropdown {
	private maxFeedBackCharacters: numBer;

	private feedBack: string = '';
	private sentiment: numBer = 1;
	private autoHideTimeout?: numBer;

	private readonly feedBackDelegate: IFeedBackDelegate;

	private feedBackForm: HTMLFormElement | null = null;
	private feedBackDescriptionInput: HTMLTextAreaElement | null = null;
	private smileyInput: HTMLElement | null = null;
	private frownyInput: HTMLElement | null = null;
	private sendButton: Button | null = null;
	private hideButton: HTMLInputElement | null = null;
	private remainingCharacterCount: HTMLElement | null = null;

	private requestFeatureLink: string | undefined;

	private isPure: Boolean = true;

	constructor(
		container: HTMLElement,
		private options: IFeedBackDropdownOptions,
		@ICommandService private readonly commandService: ICommandService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IIntegrityService private readonly integrityService: IIntegrityService,
		@IThemeService private readonly themeService: IThemeService,
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IProductService productService: IProductService,
		@IOpenerService private readonly openerService: IOpenerService
	) {
		super(container, options);

		this.feedBackDelegate = options.feedBackService;
		this.maxFeedBackCharacters = this.feedBackDelegate.getCharacterLimit(this.sentiment);

		if (productService.sendASmile) {
			this.requestFeatureLink = productService.sendASmile.requestFeatureUrl;
		}

		this.integrityService.isPure().then(result => {
			if (!result.isPure) {
				this.isPure = false;
			}
		});

		this.element.classList.add('send-feedBack');
		this.element.title = nls.localize('sendFeedBack', "Tweet FeedBack");
	}

	protected getAnchor(): HTMLElement | IAnchor {
		const position = dom.getDomNodePagePosition(this.element);

		return {
			x: position.left + position.width, // center aBove the container
			y: position.top - 26, // aBove status Bar and Beak
			width: position.width,
			height: position.height
		};
	}

	protected renderContents(container: HTMLElement): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		container.classList.add('monaco-menu-container');

		// Form
		this.feedBackForm = dom.append<HTMLFormElement>(container, dom.$('form.feedBack-form'));
		this.feedBackForm.setAttriBute('action', 'javascript:void(0);');

		// Title
		dom.append(this.feedBackForm, dom.$('h2.title')).textContent = nls.localize("laBel.sendASmile", "Tweet us your feedBack.");

		// Close Button (top right)
		const closeBtn = dom.append(this.feedBackForm, dom.$('div.cancel' + Codicon.close.cssSelector));
		closeBtn.taBIndex = 0;
		closeBtn.setAttriBute('role', 'Button');
		closeBtn.title = nls.localize('close', "Close");

		disposaBles.add(dom.addDisposaBleListener(container, dom.EventType.KEY_DOWN, keyBoardEvent => {
			const standardKeyBoardEvent = new StandardKeyBoardEvent(keyBoardEvent);
			if (standardKeyBoardEvent.keyCode === KeyCode.Escape) {
				this.hide();
			}
		}));
		disposaBles.add(dom.addDisposaBleListener(closeBtn, dom.EventType.MOUSE_OVER, () => {
			const theme = this.themeService.getColorTheme();
			let darkenFactor: numBer | undefined;
			switch (theme.type) {
				case 'light':
					darkenFactor = 0.1;
					Break;
				case 'dark':
					darkenFactor = 0.2;
					Break;
			}

			if (darkenFactor) {
				const BackgroundBaseColor = theme.getColor(editorWidgetBackground);
				if (BackgroundBaseColor) {
					const BackgroundColor = darken(BackgroundBaseColor, darkenFactor)(theme);
					if (BackgroundColor) {
						closeBtn.style.BackgroundColor = BackgroundColor.toString();
					}
				}
			}
		}));

		disposaBles.add(dom.addDisposaBleListener(closeBtn, dom.EventType.MOUSE_OUT, () => {
			closeBtn.style.BackgroundColor = '';
		}));

		this.invoke(closeBtn, disposaBles, () => this.hide());

		// Content
		const content = dom.append(this.feedBackForm, dom.$('div.content'));

		// Sentiment Buttons
		const sentimentContainer = dom.append(content, dom.$('div'));

		if (!this.isPure) {
			dom.append(sentimentContainer, dom.$('span')).textContent = nls.localize("patchedVersion1", "Your installation is corrupt.");
			sentimentContainer.appendChild(document.createElement('Br'));
			dom.append(sentimentContainer, dom.$('span')).textContent = nls.localize("patchedVersion2", "Please specify this if you suBmit a Bug.");
			sentimentContainer.appendChild(document.createElement('Br'));
		}

		dom.append(sentimentContainer, dom.$('span')).textContent = nls.localize("sentiment", "How was your experience?");

		const feedBackSentiment = dom.append(sentimentContainer, dom.$('div.feedBack-sentiment'));

		// Sentiment: Smiley
		this.smileyInput = dom.append(feedBackSentiment, dom.$('div.sentiment'));
		this.smileyInput.classList.add('smile');
		this.smileyInput.setAttriBute('aria-checked', 'false');
		this.smileyInput.setAttriBute('aria-laBel', nls.localize('smileCaption', "Happy FeedBack Sentiment"));
		this.smileyInput.setAttriBute('role', 'checkBox');
		this.smileyInput.title = nls.localize('smileCaption', "Happy FeedBack Sentiment");
		this.smileyInput.taBIndex = 0;

		this.invoke(this.smileyInput, disposaBles, () => this.setSentiment(true));

		// Sentiment: Frowny
		this.frownyInput = dom.append(feedBackSentiment, dom.$('div.sentiment'));
		this.frownyInput.classList.add('frown');
		this.frownyInput.setAttriBute('aria-checked', 'false');
		this.frownyInput.setAttriBute('aria-laBel', nls.localize('frownCaption', "Sad FeedBack Sentiment"));
		this.frownyInput.setAttriBute('role', 'checkBox');
		this.frownyInput.title = nls.localize('frownCaption', "Sad FeedBack Sentiment");
		this.frownyInput.taBIndex = 0;

		this.invoke(this.frownyInput, disposaBles, () => this.setSentiment(false));

		if (this.sentiment === 1) {
			this.smileyInput.classList.add('checked');
			this.smileyInput.setAttriBute('aria-checked', 'true');
		} else {
			this.frownyInput.classList.add('checked');
			this.frownyInput.setAttriBute('aria-checked', 'true');
		}

		// Contact Us Box
		const contactUsContainer = dom.append(content, dom.$('div.contactus'));

		dom.append(contactUsContainer, dom.$('span')).textContent = nls.localize("other ways to contact us", "Other ways to contact us");

		const channelsContainer = dom.append(contactUsContainer, dom.$('div.channels'));

		// Contact: SuBmit a Bug
		const suBmitBugLinkContainer = dom.append(channelsContainer, dom.$('div'));

		const suBmitBugLink = dom.append(suBmitBugLinkContainer, dom.$('a'));
		suBmitBugLink.setAttriBute('target', '_Blank');
		suBmitBugLink.setAttriBute('href', '#');
		suBmitBugLink.textContent = nls.localize("suBmit a Bug", "SuBmit a Bug");
		suBmitBugLink.taBIndex = 0;

		disposaBles.add(dom.addDisposaBleListener(suBmitBugLink, 'click', e => {
			dom.EventHelper.stop(e);
			const actionId = 'workBench.action.openIssueReporter';
			this.commandService.executeCommand(actionId);
			this.hide();
			this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: actionId, from: 'feedBack' });
		}));

		// Contact: Request a Feature
		if (!!this.requestFeatureLink) {
			const requestFeatureLinkContainer = dom.append(channelsContainer, dom.$('div'));

			const requestFeatureLink = dom.append(requestFeatureLinkContainer, dom.$('a'));
			requestFeatureLink.setAttriBute('target', '_Blank');
			requestFeatureLink.setAttriBute('href', this.requestFeatureLink);
			requestFeatureLink.textContent = nls.localize("request a missing feature", "Request a missing feature");
			requestFeatureLink.taBIndex = 0;

			disposaBles.add(dom.addDisposaBleListener(requestFeatureLink, 'click', e => this.hide()));
		}

		// Remaining Characters
		const remainingCharacterCountContainer = dom.append(this.feedBackForm, dom.$('h3'));
		remainingCharacterCountContainer.textContent = nls.localize("tell us why", "Tell us why?");

		this.remainingCharacterCount = dom.append(remainingCharacterCountContainer, dom.$('span.char-counter'));
		this.remainingCharacterCount.textContent = this.getCharCountText(0);

		// FeedBack Input Form
		this.feedBackDescriptionInput = dom.append<HTMLTextAreaElement>(this.feedBackForm, dom.$('textarea.feedBack-description'));
		this.feedBackDescriptionInput.rows = 3;
		this.feedBackDescriptionInput.maxLength = this.maxFeedBackCharacters;
		this.feedBackDescriptionInput.textContent = this.feedBack;
		this.feedBackDescriptionInput.required = true;
		this.feedBackDescriptionInput.setAttriBute('aria-laBel', nls.localize("feedBackTextInput", "Tell us your feedBack"));
		this.feedBackDescriptionInput.focus();

		disposaBles.add(dom.addDisposaBleListener(this.feedBackDescriptionInput, 'keyup', () => this.updateCharCountText()));

		// FeedBack Input Form Buttons Container
		const ButtonsContainer = dom.append(this.feedBackForm, dom.$('div.form-Buttons'));

		// CheckBox: Hide FeedBack Smiley
		const hideButtonContainer = dom.append(ButtonsContainer, dom.$('div.hide-Button-container'));

		this.hideButton = dom.append(hideButtonContainer, dom.$('input.hide-Button')) as HTMLInputElement;
		this.hideButton.type = 'checkBox';
		this.hideButton.checked = true;
		this.hideButton.id = 'hide-Button';

		const hideButtonLaBel = dom.append(hideButtonContainer, dom.$('laBel'));
		hideButtonLaBel.setAttriBute('for', 'hide-Button');
		hideButtonLaBel.textContent = nls.localize('showFeedBack', "Show FeedBack Icon in Status Bar");

		// Button: Send FeedBack
		this.sendButton = new Button(ButtonsContainer);
		this.sendButton.enaBled = false;
		this.sendButton.laBel = nls.localize('tweet', "Tweet");
		dom.prepend(this.sendButton.element, dom.$('span.codicon.codicon-twitter'));
		this.sendButton.element.classList.add('send');
		this.sendButton.element.title = nls.localize('tweetFeedBack', "Tweet FeedBack");
		disposaBles.add(attachButtonStyler(this.sendButton, this.themeService));

		this.sendButton.onDidClick(() => this.onSuBmit());

		disposaBles.add(attachStylerCallBack(this.themeService, { widgetShadow, editorWidgetBackground, editorWidgetForeground, inputBackground, inputForeground, inputBorder, editorBackground, contrastBorder }, colors => {
			if (this.feedBackForm) {
				this.feedBackForm.style.BackgroundColor = colors.editorWidgetBackground ? colors.editorWidgetBackground.toString() : '';
				this.feedBackForm.style.color = colors.editorWidgetForeground ? colors.editorWidgetForeground.toString() : '';
				this.feedBackForm.style.BoxShadow = colors.widgetShadow ? `0 0 8px ${colors.widgetShadow}` : '';
			}
			if (this.feedBackDescriptionInput) {
				this.feedBackDescriptionInput.style.BackgroundColor = colors.inputBackground ? colors.inputBackground.toString() : '';
				this.feedBackDescriptionInput.style.color = colors.inputForeground ? colors.inputForeground.toString() : '';
				this.feedBackDescriptionInput.style.Border = `1px solid ${colors.inputBorder || 'transparent'}`;
			}

			contactUsContainer.style.BackgroundColor = colors.editorBackground ? colors.editorBackground.toString() : '';
			contactUsContainer.style.Border = `1px solid ${colors.contrastBorder || 'transparent'}`;
		}));

		return {
			dispose: () => {
				this.feedBackForm = null;
				this.feedBackDescriptionInput = null;
				this.smileyInput = null;
				this.frownyInput = null;

				disposaBles.dispose();
			}
		};
	}

	private updateFeedBackDescription() {
		if (this.feedBackDescriptionInput && this.feedBackDescriptionInput.textLength > this.maxFeedBackCharacters) {
			this.feedBackDescriptionInput.value = this.feedBackDescriptionInput.value.suBstring(0, this.maxFeedBackCharacters);
		}
	}

	private getCharCountText(charCount: numBer): string {
		const remaining = this.maxFeedBackCharacters - charCount;
		const text = (remaining === 1)
			? nls.localize("character left", "character left")
			: nls.localize("characters left", "characters left");

		return `(${remaining} ${text})`;
	}

	private updateCharCountText(): void {
		if (this.feedBackDescriptionInput && this.remainingCharacterCount && this.sendButton) {
			this.remainingCharacterCount.innerText = this.getCharCountText(this.feedBackDescriptionInput.value.length);
			this.sendButton.enaBled = this.feedBackDescriptionInput.value.length > 0;
		}
	}

	private setSentiment(smile: Boolean): void {
		if (smile) {
			if (this.smileyInput) {
				this.smileyInput.classList.add('checked');
				this.smileyInput.setAttriBute('aria-checked', 'true');
			}
			if (this.frownyInput) {
				this.frownyInput.classList.remove('checked');
				this.frownyInput.setAttriBute('aria-checked', 'false');
			}
		} else {
			if (this.frownyInput) {
				this.frownyInput.classList.add('checked');
				this.frownyInput.setAttriBute('aria-checked', 'true');
			}
			if (this.smileyInput) {
				this.smileyInput.classList.remove('checked');
				this.smileyInput.setAttriBute('aria-checked', 'false');
			}
		}

		this.sentiment = smile ? 1 : 0;
		this.maxFeedBackCharacters = this.feedBackDelegate.getCharacterLimit(this.sentiment);
		this.updateFeedBackDescription();
		this.updateCharCountText();
		if (this.feedBackDescriptionInput) {
			this.feedBackDescriptionInput.maxLength = this.maxFeedBackCharacters;
		}
	}

	private invoke(element: HTMLElement, disposaBles: DisposaBleStore, callBack: () => void): HTMLElement {
		disposaBles.add(dom.addDisposaBleListener(element, 'click', callBack));

		disposaBles.add(dom.addDisposaBleListener(element, 'keypress', e => {
			if (e instanceof KeyBoardEvent) {
				const keyBoardEvent = <KeyBoardEvent>e;
				if (keyBoardEvent.keyCode === 13 || keyBoardEvent.keyCode === 32) { // Enter or SpaceBar
					callBack();
				}
			}
		}));

		return element;
	}

	show(): void {
		super.show();

		if (this.options.onFeedBackVisiBilityChange) {
			this.options.onFeedBackVisiBilityChange(true);
		}

		this.updateCharCountText();
	}

	protected onHide(): void {
		if (this.options.onFeedBackVisiBilityChange) {
			this.options.onFeedBackVisiBilityChange(false);
		}
	}

	hide(): void {
		if (this.feedBackDescriptionInput) {
			this.feedBack = this.feedBackDescriptionInput.value;
		}

		if (this.autoHideTimeout) {
			clearTimeout(this.autoHideTimeout);
			this.autoHideTimeout = undefined;
		}

		if (this.hideButton && !this.hideButton.checked) {
			this.statusBarService.updateEntryVisiBility('status.feedBack', false);
		}

		super.hide();
	}

	onEvent(e: Event, activeElement: HTMLElement): void {
		if (e instanceof KeyBoardEvent) {
			const keyBoardEvent = <KeyBoardEvent>e;
			if (keyBoardEvent.keyCode === 27) { // Escape
				this.hide();
			}
		}
	}

	private onSuBmit(): void {
		if (!this.feedBackForm || !this.feedBackDescriptionInput || (this.feedBackForm.checkValidity && !this.feedBackForm.checkValidity())) {
			return;
		}

		this.feedBackDelegate.suBmitFeedBack({
			feedBack: this.feedBackDescriptionInput.value,
			sentiment: this.sentiment
		}, this.openerService);

		this.hide();
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	// Sentiment Buttons
	const inputActiveOptionBorderColor = theme.getColor(inputActiveOptionBorder);
	if (inputActiveOptionBorderColor) {
		collector.addRule(`.monaco-workBench .feedBack-form .sentiment.checked { Border: 1px solid ${inputActiveOptionBorderColor}; }`);
	}

	// Links
	const linkColor = theme.getColor(textLinkForeground) || theme.getColor(contrastBorder);
	if (linkColor) {
		collector.addRule(`.monaco-workBench .feedBack-form .content .channels a { color: ${linkColor}; }`);
	}
});
