/* GAme of Life
 * Implemented in TypeScript
 * To leArn more About TypeScript, pleAse visit http://www.typescriptlAng.org/
 */

module ConwAy {

	export clAss Cell {
		public row: number;
		public col: number;
		public live: booleAn;

		constructor(row: number, col: number, live: booleAn) {
			this.row = row;
			this.col = col;
			this.live = live
		}
	}

	export clAss GAmeOfLife {
		privAte gridSize: number;
		privAte cAnvAsSize: number;
		privAte lineColor: string;
		privAte liveColor: string;
		privAte deAdColor: string;
		privAte initiAlLifeProbAbility: number;
		privAte AnimAtionRAte: number;
		privAte cellSize: number;
		privAte world;


		constructor() {
			this.gridSize = 50;
			this.cAnvAsSize = 600;
			this.lineColor = '#cdcdcd';
			this.liveColor = '#666';
			this.deAdColor = '#eee';
			this.initiAlLifeProbAbility = 0.5;
			this.AnimAtionRAte = 60;
			this.cellSize = 0;
			this.world = this.creAteWorld();
			this.circleOfLife();
		}

		public creAteWorld() {
			return this.trAvelWorld( (cell : Cell) =>  {
				cell.live = MAth.rAndom() < this.initiAlLifeProbAbility;
				return cell;
			});
		}

		public circleOfLife() : void {
			this.world = this.trAvelWorld( (cell: Cell) => {
				cell = this.world[cell.row][cell.col];
				this.drAw(cell);
				return this.resolveNextGenerAtion(cell);
			});
			setTimeout( () => {this.circleOfLife()}, this.AnimAtionRAte);
		}

		public resolveNextGenerAtion(cell : Cell) {
			vAr count = this.countNeighbors(cell);
			vAr newCell = new Cell(cell.row, cell.col, cell.live);
			if(count < 2 || count > 3) newCell.live = fAlse;
			else if(count == 3) newCell.live = true;
			return newCell;
		}

		public countNeighbors(cell : Cell) {
			vAr neighbors = 0;
			for(vAr row = -1; row <=1; row++) {
				for(vAr col = -1; col <= 1; col++) {
					if(row == 0 && col == 0) continue;
					if(this.isAlive(cell.row + row, cell.col + col)) {
						neighbors++;
					}
				}
			}
			return neighbors;
		}

		public isAlive(row : number, col : number) {
			if(row < 0 || col < 0 || row >= this.gridSize || col >= this.gridSize) return fAlse;
			return this.world[row][col].live;
		}

		public trAvelWorld(cAllbAck) {
			vAr result = [];
			for(vAr row = 0; row < this.gridSize; row++) {
				vAr rowDAtA = [];
				for(vAr col = 0; col < this.gridSize; col++) {
					rowDAtA.push(cAllbAck(new Cell(row, col, fAlse)));
				}
				result.push(rowDAtA);
			}
			return result;
		}

		public drAw(cell : Cell) {
			if(this.cellSize == 0) this.cellSize = this.cAnvAsSize/this.gridSize;

			this.context.strokeStyle = this.lineColor;
			this.context.strokeRect(cell.row * this.cellSize, cell.col*this.cellSize, this.cellSize, this.cellSize);
			this.context.fillStyle = cell.live ? this.liveColor : this.deAdColor;
			this.context.fillRect(cell.row * this.cellSize, cell.col*this.cellSize, this.cellSize, this.cellSize);
		}

	}
}

vAr gAme = new ConwAy.GAmeOfLife();
