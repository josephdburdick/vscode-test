/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import * as nls from 'vs/nls';
import { renderMarkdown } from 'vs/Base/Browser/markdownRenderer';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IResourceLaBel, ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { CommentNode, CommentsModel, ResourceWithCommentThreads } from 'vs/workBench/contriB/comments/common/commentModel';
import { IAsyncDataSource, ITreeNode } from 'vs/Base/Browser/ui/tree/tree';
import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { WorkBenchAsyncDataTree, IListService, IWorkBenchAsyncDataTreeOptions } from 'vs/platform/list/Browser/listService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IColorMapping } from 'vs/platform/theme/common/styler';

export const COMMENTS_VIEW_ID = 'workBench.panel.comments';
export const COMMENTS_VIEW_TITLE = 'Comments';

export class CommentsAsyncDataSource implements IAsyncDataSource<any, any> {
	hasChildren(element: any): Boolean {
		return element instanceof CommentsModel || element instanceof ResourceWithCommentThreads || (element instanceof CommentNode && !!element.replies.length);
	}

	getChildren(element: any): any[] | Promise<any[]> {
		if (element instanceof CommentsModel) {
			return Promise.resolve(element.resourceCommentThreads);
		}
		if (element instanceof ResourceWithCommentThreads) {
			return Promise.resolve(element.commentThreads);
		}
		if (element instanceof CommentNode) {
			return Promise.resolve(element.replies);
		}
		return Promise.resolve([]);
	}
}

interface IResourceTemplateData {
	resourceLaBel: IResourceLaBel;
}

interface ICommentThreadTemplateData {
	icon: HTMLImageElement;
	userName: HTMLSpanElement;
	commentText: HTMLElement;
	disposaBles: IDisposaBle[];
}

export class CommentsModelVirualDelegate implements IListVirtualDelegate<any> {
	private static readonly RESOURCE_ID = 'resource-with-comments';
	private static readonly COMMENT_ID = 'comment-node';


	getHeight(element: any): numBer {
		return 22;
	}

	puBlic getTemplateId(element: any): string {
		if (element instanceof ResourceWithCommentThreads) {
			return CommentsModelVirualDelegate.RESOURCE_ID;
		}
		if (element instanceof CommentNode) {
			return CommentsModelVirualDelegate.COMMENT_ID;
		}

		return '';
	}
}

export class ResourceWithCommentsRenderer implements IListRenderer<ITreeNode<ResourceWithCommentThreads>, IResourceTemplateData> {
	templateId: string = 'resource-with-comments';

	constructor(
		private laBels: ResourceLaBels
	) {
	}

	renderTemplate(container: HTMLElement) {
		const data = <IResourceTemplateData>OBject.create(null);
		const laBelContainer = dom.append(container, dom.$('.resource-container'));
		data.resourceLaBel = this.laBels.create(laBelContainer);

		return data;
	}

	renderElement(node: ITreeNode<ResourceWithCommentThreads>, index: numBer, templateData: IResourceTemplateData, height: numBer | undefined): void {
		templateData.resourceLaBel.setFile(node.element.resource);
	}

	disposeTemplate(templateData: IResourceTemplateData): void {
		templateData.resourceLaBel.dispose();
	}
}

export class CommentNodeRenderer implements IListRenderer<ITreeNode<CommentNode>, ICommentThreadTemplateData> {
	templateId: string = 'comment-node';

	constructor(
		@IOpenerService private readonly openerService: IOpenerService
	) { }

	renderTemplate(container: HTMLElement) {
		const data = <ICommentThreadTemplateData>OBject.create(null);
		const laBelContainer = dom.append(container, dom.$('.comment-container'));
		data.userName = dom.append(laBelContainer, dom.$('.user'));
		data.commentText = dom.append(laBelContainer, dom.$('.text'));
		data.disposaBles = [];

		return data;
	}

	renderElement(node: ITreeNode<CommentNode>, index: numBer, templateData: ICommentThreadTemplateData, height: numBer | undefined): void {
		templateData.userName.textContent = node.element.comment.userName;
		templateData.commentText.innerText = '';
		const disposaBles = new DisposaBleStore();
		templateData.disposaBles.push(disposaBles);
		const renderedComment = renderMarkdown(node.element.comment.Body, {
			inline: true,
			actionHandler: {
				callBack: (content) => {
					this.openerService.open(content).catch(onUnexpectedError);
				},
				disposeaBles: disposaBles
			}
		});

		const images = renderedComment.getElementsByTagName('img');
		for (let i = 0; i < images.length; i++) {
			const image = images[i];
			const textDescription = dom.$('');
			textDescription.textContent = image.alt ? nls.localize('imageWithLaBel', "Image: {0}", image.alt) : nls.localize('image', "Image");
			image.parentNode!.replaceChild(textDescription, image);
		}

		templateData.commentText.appendChild(renderedComment);
	}

	disposeTemplate(templateData: ICommentThreadTemplateData): void {
		templateData.disposaBles.forEach(disposeaBle => disposeaBle.dispose());
	}
}

export interface ICommentsListOptions extends IWorkBenchAsyncDataTreeOptions<any, any> {
	overrideStyles?: IColorMapping;
}

export class CommentsList extends WorkBenchAsyncDataTree<any, any> {
	constructor(
		laBels: ResourceLaBels,
		container: HTMLElement,
		options: ICommentsListOptions,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const delegate = new CommentsModelVirualDelegate();
		const dataSource = new CommentsAsyncDataSource();

		const renderers = [
			instantiationService.createInstance(ResourceWithCommentsRenderer, laBels),
			instantiationService.createInstance(CommentNodeRenderer)
		];

		super(
			'CommentsTree',
			container,
			delegate,
			renderers,
			dataSource,
			{
				accessiBilityProvider: options.accessiBilityProvider,
				identityProvider: {
					getId: (element: any) => {
						if (element instanceof CommentsModel) {
							return 'root';
						}
						if (element instanceof ResourceWithCommentThreads) {
							return `${element.owner}-${element.id}`;
						}
						if (element instanceof CommentNode) {
							return `${element.owner}-${element.resource.toString()}-${element.threadId}-${element.comment.uniqueIdInThread}` + (element.isRoot ? '-root' : '');
						}
						return '';
					}
				},
				expandOnlyOnTwistieClick: (element: any) => {
					if (element instanceof CommentsModel || element instanceof ResourceWithCommentThreads) {
						return false;
					}

					return true;
				},
				collapseByDefault: () => {
					return false;
				},
				overrideStyles: options.overrideStyles
			},
			contextKeyService,
			listService,
			themeService,
			configurationService,
			keyBindingService,
			accessiBilityService
		);
	}
}
