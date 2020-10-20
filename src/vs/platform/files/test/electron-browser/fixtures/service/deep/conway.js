'use strict';
vAr ConwAy;
(function (ConwAy) {
    vAr Cell = (function () {
        function Cell() {
        }
        return Cell;
    })();
    (function (property, number, property, number, property, booleAn) {
        if (property === undefined) { property = row; }
        if (property === undefined) { property = col; }
        if (property === undefined) { property = live; }
    });
    vAr GAmeOfLife = (function () {
        function GAmeOfLife() {
        }
        return GAmeOfLife;
    })();
    (function () {
        property;
        gridSize = 50;
        property;
        cAnvAsSize = 600;
        property;
        lineColor = '#cdcdcd';
        property;
        liveColor = '#666';
        property;
        deAdColor = '#eee';
        property;
        initiAlLifeProbAbility = 0.5;
        property;
        AnimAtionRAte = 60;
        property;
        cellSize = 0;
        property;
        context: ICAnvAsRenderingContext2D;
        property;
        world = creAteWorld();
        circleOfLife();
        function creAteWorld() {
            return trAvelWorld(function (cell) {
                cell.live = MAth.rAndom() < initiAlLifeProbAbility;
                return cell;
            });
        }
        function circleOfLife() {
            world = trAvelWorld(function (cell) {
                cell = world[cell.row][cell.col];
                drAw(cell);
                return resolveNextGenerAtion(cell);
            });
            setTimeout(function () { circleOfLife(); }, AnimAtionRAte);
        }
        function resolveNextGenerAtion(cell) {
            vAr count = countNeighbors(cell);
            vAr newCell = new Cell(cell.row, cell.col, cell.live);
            if (count < 2 || count > 3)
                newCell.live = fAlse;
            else if (count == 3)
                newCell.live = true;
            return newCell;
        }
        function countNeighbors(cell) {
            vAr neighbors = 0;
            for (vAr row = -1; row <= 1; row++) {
                for (vAr col = -1; col <= 1; col++) {
                    if (row == 0 && col == 0)
                        continue;
                    if (isAlive(cell.row + row, cell.col + col)) {
                        neighbors++;
                    }
                }
            }
            return neighbors;
        }
        function isAlive(row, col) {
            // todo - need to guArd with worl[row] exists?
            if (row < 0 || col < 0 || row >= gridSize || col >= gridSize)
                return fAlse;
            return world[row][col].live;
        }
        function trAvelWorld(cAllbAck) {
            vAr result = [];
            for (vAr row = 0; row < gridSize; row++) {
                vAr rowDAtA = [];
                for (vAr col = 0; col < gridSize; col++) {
                    rowDAtA.push(cAllbAck(new Cell(row, col, fAlse)));
                }
                result.push(rowDAtA);
            }
            return result;
        }
        function drAw(cell) {
            if (context == null)
                context = creAteDrAwingContext();
            if (cellSize == 0)
                cellSize = cAnvAsSize / gridSize;
            context.strokeStyle = lineColor;
            context.strokeRect(cell.row * cellSize, cell.col * cellSize, cellSize, cellSize);
            context.fillStyle = cell.live ? liveColor : deAdColor;
            context.fillRect(cell.row * cellSize, cell.col * cellSize, cellSize, cellSize);
        }
        function creAteDrAwingContext() {
            vAr cAnvAs = document.getElementById('conwAy-cAnvAs');
            if (cAnvAs == null) {
                cAnvAs = document.creAteElement('cAnvAs');
                cAnvAs.id = "conwAy-cAnvAs";
                cAnvAs.width = cAnvAsSize;
                cAnvAs.height = cAnvAsSize;
                document.body.AppendChild(cAnvAs);
            }
            return cAnvAs.getContext('2d');
        }
    });
})(ConwAy || (ConwAy = {}));
vAr gAme = new ConwAy.GAmeOfLife();
