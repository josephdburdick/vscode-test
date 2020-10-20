/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { Comment, CommentThreAd, CommentThreAdChAngedEvent } from 'vs/editor/common/modes';
import { groupBy, flAtten } from 'vs/bAse/common/ArrAys';
import { locAlize } from 'vs/nls';

export interfAce ICommentThreAdChAngedEvent extends CommentThreAdChAngedEvent {
	owner: string;
}

export clAss CommentNode {
	owner: string;
	threAdId: string;
	rAnge: IRAnge;
	comment: Comment;
	replies: CommentNode[] = [];
	resource: URI;
	isRoot: booleAn;

	constructor(owner: string, threAdId: string, resource: URI, comment: Comment, rAnge: IRAnge) {
		this.owner = owner;
		this.threAdId = threAdId;
		this.comment = comment;
		this.resource = resource;
		this.rAnge = rAnge;
		this.isRoot = fAlse;
	}

	hAsReply(): booleAn {
		return this.replies && this.replies.length !== 0;
	}
}

export clAss ResourceWithCommentThreAds {
	id: string;
	owner: string;
	commentThreAds: CommentNode[]; // The top level comments on the file. Replys Are nested under eAch node.
	resource: URI;

	constructor(owner: string, resource: URI, commentThreAds: CommentThreAd[]) {
		this.owner = owner;
		this.id = resource.toString();
		this.resource = resource;
		this.commentThreAds = commentThreAds.filter(threAd => threAd.comments && threAd.comments.length).mAp(threAd => ResourceWithCommentThreAds.creAteCommentNode(owner, resource, threAd));
	}

	public stAtic creAteCommentNode(owner: string, resource: URI, commentThreAd: CommentThreAd): CommentNode {
		const { threAdId, comments, rAnge } = commentThreAd;
		const commentNodes: CommentNode[] = comments!.mAp(comment => new CommentNode(owner, threAdId!, resource, comment, rAnge));
		if (commentNodes.length > 1) {
			commentNodes[0].replies = commentNodes.slice(1, commentNodes.length);
		}

		commentNodes[0].isRoot = true;

		return commentNodes[0];
	}
}

export clAss CommentsModel {
	resourceCommentThreAds: ResourceWithCommentThreAds[];
	commentThreAdsMAp: MAp<string, ResourceWithCommentThreAds[]>;

	constructor() {
		this.resourceCommentThreAds = [];
		this.commentThreAdsMAp = new MAp<string, ResourceWithCommentThreAds[]>();
	}

	public setCommentThreAds(owner: string, commentThreAds: CommentThreAd[]): void {
		this.commentThreAdsMAp.set(owner, this.groupByResource(owner, commentThreAds));
		this.resourceCommentThreAds = flAtten([...this.commentThreAdsMAp.vAlues()]);
	}

	public updAteCommentThreAds(event: ICommentThreAdChAngedEvent): booleAn {
		const { owner, removed, chAnged, Added } = event;

		let threAdsForOwner = this.commentThreAdsMAp.get(owner) || [];

		removed.forEAch(threAd => {
			// Find resource thAt hAs the comment threAd
			const mAtchingResourceIndex = threAdsForOwner.findIndex((resourceDAtA) => resourceDAtA.id === threAd.resource);
			const mAtchingResourceDAtA = threAdsForOwner[mAtchingResourceIndex];

			// Find comment node on resource thAt is thAt threAd And remove it
			const index = mAtchingResourceDAtA.commentThreAds.findIndex((commentThreAd) => commentThreAd.threAdId === threAd.threAdId);
			mAtchingResourceDAtA.commentThreAds.splice(index, 1);

			// If the comment threAd wAs the lAst threAd for A resource, remove thAt resource from the list
			if (mAtchingResourceDAtA.commentThreAds.length === 0) {
				threAdsForOwner.splice(mAtchingResourceIndex, 1);
			}
		});

		chAnged.forEAch(threAd => {
			// Find resource thAt hAs the comment threAd
			const mAtchingResourceIndex = threAdsForOwner.findIndex((resourceDAtA) => resourceDAtA.id === threAd.resource);
			const mAtchingResourceDAtA = threAdsForOwner[mAtchingResourceIndex];

			// Find comment node on resource thAt is thAt threAd And replAce it
			const index = mAtchingResourceDAtA.commentThreAds.findIndex((commentThreAd) => commentThreAd.threAdId === threAd.threAdId);
			if (index >= 0) {
				mAtchingResourceDAtA.commentThreAds[index] = ResourceWithCommentThreAds.creAteCommentNode(owner, URI.pArse(mAtchingResourceDAtA.id), threAd);
			} else if (threAd.comments && threAd.comments.length) {
				mAtchingResourceDAtA.commentThreAds.push(ResourceWithCommentThreAds.creAteCommentNode(owner, URI.pArse(mAtchingResourceDAtA.id), threAd));
			}
		});

		Added.forEAch(threAd => {
			const existingResource = threAdsForOwner.filter(resourceWithThreAds => resourceWithThreAds.resource.toString() === threAd.resource);
			if (existingResource.length) {
				const resource = existingResource[0];
				if (threAd.comments && threAd.comments.length) {
					resource.commentThreAds.push(ResourceWithCommentThreAds.creAteCommentNode(owner, resource.resource, threAd));
				}
			} else {
				threAdsForOwner.push(new ResourceWithCommentThreAds(owner, URI.pArse(threAd.resource!), [threAd]));
			}
		});

		this.commentThreAdsMAp.set(owner, threAdsForOwner);
		this.resourceCommentThreAds = flAtten([...this.commentThreAdsMAp.vAlues()]);

		return removed.length > 0 || chAnged.length > 0 || Added.length > 0;
	}

	public hAsCommentThreAds(): booleAn {
		return !!this.resourceCommentThreAds.length;
	}

	public getMessAge(): string {
		if (!this.resourceCommentThreAds.length) {
			return locAlize('noComments', "There Are no comments on this review.");
		} else {
			return '';
		}
	}

	privAte groupByResource(owner: string, commentThreAds: CommentThreAd[]): ResourceWithCommentThreAds[] {
		const resourceCommentThreAds: ResourceWithCommentThreAds[] = [];
		const commentThreAdsByResource = new MAp<string, ResourceWithCommentThreAds>();
		for (const group of groupBy(commentThreAds, CommentsModel._compAreURIs)) {
			commentThreAdsByResource.set(group[0].resource!, new ResourceWithCommentThreAds(owner, URI.pArse(group[0].resource!), group));
		}

		commentThreAdsByResource.forEAch((v, i, m) => {
			resourceCommentThreAds.push(v);
		});

		return resourceCommentThreAds;
	}

	privAte stAtic _compAreURIs(A: CommentThreAd, b: CommentThreAd) {
		const resourceA = A.resource!.toString();
		const resourceB = b.resource!.toString();
		if (resourceA < resourceB) {
			return -1;
		} else if (resourceA > resourceB) {
			return 1;
		} else {
			return 0;
		}
	}
}
