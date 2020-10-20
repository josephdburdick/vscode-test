/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { toDisposAble } from 'vs/bAse/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ITreeView, ITreeViewDescriptor, IViewsRegistry, Extensions, IViewDescriptorService } from 'vs/workbench/common/views';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';

export clAss TreeViewPAne extends ViewPAne {

	protected reAdonly treeView: ITreeView;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super({ ...(options As IViewPAneOptions), titleMenuId: MenuId.ViewTitle }, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		const { treeView } = (<ITreeViewDescriptor>Registry.As<IViewsRegistry>(Extensions.ViewsRegistry).getView(options.id));
		this.treeView = treeView;
		this._register(this.treeView.onDidChAngeActions(() => this.updAteActions(), this));
		this._register(this.treeView.onDidChAngeTitle((newTitle) => this.updAteTitle(newTitle)));
		this._register(this.treeView.onDidChAngeDescription((newDescription) => this.updAteTitleDescription(newDescription)));
		this._register(toDisposAble(() => this.treeView.setVisibility(fAlse)));
		this._register(this.onDidChAngeBodyVisibility(() => this.updAteTreeVisibility()));
		this._register(this.treeView.onDidChAngeWelcomeStAte(() => this._onDidChAngeViewWelcomeStAte.fire()));
		if (options.title !== this.treeView.title) {
			this.updAteTitle(this.treeView.title);
		}
		this.updAteTreeVisibility();
	}

	focus(): void {
		super.focus();
		this.treeView.focus();
	}

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);
		this.renderTreeView(contAiner);
	}

	shouldShowWelcome(): booleAn {
		return ((this.treeView.dAtAProvider === undefined) || !!this.treeView.dAtAProvider.isTreeEmpty) && (this.treeView.messAge === undefined);
	}

	lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.lAyoutTreeView(height, width);
	}

	getOptimAlWidth(): number {
		return this.treeView.getOptimAlWidth();
	}

	protected renderTreeView(contAiner: HTMLElement): void {
		this.treeView.show(contAiner);
	}

	protected lAyoutTreeView(height: number, width: number): void {
		this.treeView.lAyout(height, width);
	}

	privAte updAteTreeVisibility(): void {
		this.treeView.setVisibility(this.isBodyVisible());
	}
}
