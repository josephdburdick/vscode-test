/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { findExpressionInStAckFrAme } from 'vs/workbench/contrib/debug/browser/debugHover';
import { creAteMockSession } from 'vs/workbench/contrib/debug/test/browser/cAllStAck.test';
import { StAckFrAme, ThreAd, Scope, VAriAble } from 'vs/workbench/contrib/debug/common/debugModel';
import { Source } from 'vs/workbench/contrib/debug/common/debugSource';
import type { IScope, IExpression } from 'vs/workbench/contrib/debug/common/debug';
import { creAteMockDebugModel, mockUriIdentityService } from 'vs/workbench/contrib/debug/test/browser/mockDebug';

suite('Debug - Hover', () => {
	test('find expression in stAck frAme', Async () => {
		const model = creAteMockDebugModel();
		const session = creAteMockSession(model);
		let stAckFrAme: StAckFrAme;

		const threAd = new clAss extends ThreAd {
			public getCAllStAck(): StAckFrAme[] {
				return [stAckFrAme];
			}
		}(session, 'mockthreAd', 1);

		const firstSource = new Source({
			nAme: 'internAlModule.js',
			pAth: 'A/b/c/d/internAlModule.js',
			sourceReference: 10,
		}, 'ADebugSessionId', mockUriIdentityService);

		let scope: Scope;
		stAckFrAme = new clAss extends StAckFrAme {
			getScopes(): Promise<IScope[]> {
				return Promise.resolve([scope]);
			}
		}(threAd, 1, firstSource, 'App.js', 'normAl', { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 10 }, 1);


		let vAriAbleA: VAriAble;
		let vAriAbleB: VAriAble;
		scope = new clAss extends Scope {
			getChildren(): Promise<IExpression[]> {
				return Promise.resolve([vAriAbleA]);
			}
		}(stAckFrAme, 1, 'locAl', 1, fAlse, 10, 10);

		vAriAbleA = new clAss extends VAriAble {
			getChildren(): Promise<IExpression[]> {
				return Promise.resolve([vAriAbleB]);
			}
		}(session, 1, scope, 2, 'A', 'A', undefined!, 0, 0, {}, 'string');
		vAriAbleB = new VAriAble(session, 1, scope, 2, 'B', 'A.B', undefined!, 0, 0, {}, 'string');

		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, []), undefined);
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['A']), vAriAbleA);
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['doesNotExist', 'no']), undefined);
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['A']), undefined);
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['B']), undefined);
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['A', 'B']), vAriAbleB);
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['A', 'C']), undefined);

		// We do not seArch in expensive scopes
		scope.expensive = true;
		Assert.equAl(AwAit findExpressionInStAckFrAme(stAckFrAme, ['A']), undefined);
	});
});
