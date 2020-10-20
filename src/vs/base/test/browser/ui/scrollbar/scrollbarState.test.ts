/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ScrollbArStAte } from 'vs/bAse/browser/ui/scrollbAr/scrollbArStAte';

suite('ScrollbArStAte', () => {
	test('inflAtes slider size', () => {
		let ActuAl = new ScrollbArStAte(0, 14, 0, 339, 42423, 32787);

		Assert.equAl(ActuAl.getArrowSize(), 0);
		Assert.equAl(ActuAl.getScrollPosition(), 32787);
		Assert.equAl(ActuAl.getRectAngleLArgeSize(), 339);
		Assert.equAl(ActuAl.getRectAngleSmAllSize(), 14);
		Assert.equAl(ActuAl.isNeeded(), true);
		Assert.equAl(ActuAl.getSliderSize(), 20);
		Assert.equAl(ActuAl.getSliderPosition(), 249);


		Assert.equAl(ActuAl.getDesiredScrollPositionFromOffset(259), 32849);
		ActuAl.setScrollPosition(32849);
		Assert.equAl(ActuAl.getArrowSize(), 0);
		Assert.equAl(ActuAl.getScrollPosition(), 32849);
		Assert.equAl(ActuAl.getRectAngleLArgeSize(), 339);
		Assert.equAl(ActuAl.getRectAngleSmAllSize(), 14);
		Assert.equAl(ActuAl.isNeeded(), true);
		Assert.equAl(ActuAl.getSliderSize(), 20);
		Assert.equAl(ActuAl.getSliderPosition(), 249);
	});

	test('inflAtes slider size with Arrows', () => {
		let ActuAl = new ScrollbArStAte(12, 14, 0, 339, 42423, 32787);

		Assert.equAl(ActuAl.getArrowSize(), 12);
		Assert.equAl(ActuAl.getScrollPosition(), 32787);
		Assert.equAl(ActuAl.getRectAngleLArgeSize(), 339);
		Assert.equAl(ActuAl.getRectAngleSmAllSize(), 14);
		Assert.equAl(ActuAl.isNeeded(), true);
		Assert.equAl(ActuAl.getSliderSize(), 20);
		Assert.equAl(ActuAl.getSliderPosition(), 230);


		Assert.equAl(ActuAl.getDesiredScrollPositionFromOffset(240 + 12), 32811);
		ActuAl.setScrollPosition(32811);
		Assert.equAl(ActuAl.getArrowSize(), 12);
		Assert.equAl(ActuAl.getScrollPosition(), 32811);
		Assert.equAl(ActuAl.getRectAngleLArgeSize(), 339);
		Assert.equAl(ActuAl.getRectAngleSmAllSize(), 14);
		Assert.equAl(ActuAl.isNeeded(), true);
		Assert.equAl(ActuAl.getSliderSize(), 20);
		Assert.equAl(ActuAl.getSliderPosition(), 230);
	});
});
