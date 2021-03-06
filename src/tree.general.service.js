'use strict';

(function () {
    angular.module('iTableTree').factory('TreeGeneralService', ['UtilService', function (UtilService) {
        function TreeGeneralService($scope) {
            this.$scope = $scope;
        }


        TreeGeneralService.prototype.adjustCols = function (wrapperWidth, gtMinWidthCols) {
            var totalColWidth = 0;
            angular.forEach(gtMinWidthCols, function (col) {
                totalColWidth += col.width;
            });

            var colWidthRatios = [];
            angular.forEach(gtMinWidthCols, function (col) {
                colWidthRatios.push(col.width / totalColWidth);
            });

            var indexes = [];
            for (var c = 0; c < gtMinWidthCols.length; c++) {
                var col = gtMinWidthCols[c];
                var nw = wrapperWidth * colWidthRatios[c];
                if (nw < col.minWidth) {
                    col.width = col.minWidth;
                    wrapperWidth -= col.minWidth;
                    indexes.push(c);
                }
            }
            if (indexes.length > 0) {
                var remainingCols = [];
                angular.forEach(gtMinWidthCols, function (val, key) {
                    if (indexes.indexOf(key) === -1) {
                        remainingCols.push(val);
                    }
                });
                this.adjustCols(wrapperWidth, remainingCols);
            } else {
                for (var f = 0; f < gtMinWidthCols.length; f++) {
                    gtMinWidthCols[f].width = wrapperWidth * colWidthRatios[f];
                }
            }
        };


        TreeGeneralService.prototype.setCellWidth = function (diffWidth) {
            var $scope = this.$scope;
            var colTreeWidth = 0;
            angular.forEach($scope.colDefs, function (col) {
                colTreeWidth += col.width;
            });

            var wrapperWidth = $scope.treeWidth;
            var hasScrollBar = $scope.treeBody.get(0).scrollHeight >= $scope.treeBody.outerHeight();
            wrapperWidth = hasScrollBar ? (wrapperWidth - $scope.scrollbarWidth) : wrapperWidth;


            if (diffWidth === undefined && wrapperWidth > colTreeWidth) {
                if ($scope.options.isFitTreeContainer && wrapperWidth < colTreeWidth) {
                    //check if all min with < wrapper
                    var allMinWidth = 0;
                    angular.forEach($scope.colDefs, function (col) {
                        allMinWidth += col.minWidth;
                    });
                    //if all min width < wrapper, throw error, set isFitTreeContainer to false, and adjust
                    if (allMinWidth > wrapperWidth) {
                        console.error('column total minimum is greater than the tree width, setting isFitTreeContainer to false');
                        $scope.options.isFitTreeContainer = false;
                    } else {
                        //fit to container but keeping col min width
                        this.adjustCols(wrapperWidth, $scope.colDefs);
                    }
                } else if (wrapperWidth > colTreeWidth) {
                    var newWidth = 0;
                    //expand to fit the container
                    angular.forEach($scope.colDefs, function (col) {
                        col.width = (col.width / treeWidth) * wrapperWidth;
                        newWidth += col.width;
                    });
                    //add the rounded width
                    if (newWidth < wrapperWidth) {
                        $scope.colDefs[0].width += wrapperWidth - newWidth;
                    }
                }
            } else {
                var nextCol = $scope.colDefs[$scope.resizingColIndex + 1];
                var nextColNewWidth = (parseFloat(nextCol.width) - diffWidth);
                if (nextColNewWidth > nextCol.minWidth) {
                    nextCol.width = nextColNewWidth;
                    $scope.colDefs[$scope.resizingColIndex].width += diffWidth;
                } else if (nextColNewWidth < nextCol.minWidth) {
                    var gtMinWidthCols = [];
                    var newWrapperWidth = 0;
                    for (var i = $scope.resizingColIndex + 2; i < $scope.colDefs.length; i++) {
                        gtMinWidthCols.push($scope.colDefs[i]);
                        newWrapperWidth += $scope.colDefs[i].width;
                    }
                    this.adjustCols(newWrapperWidth - diffWidth, gtMinWidthCols);
                }
            }


            if ($scope.$root && !$scope.$root.$$phase) {
                $scope.$digest();
            }
        };


        /**
         * ****************** tree init related functions ******************
         */

        /**
         * iterate each branch of the data tree
         * @param callback
         */
        TreeGeneralService.prototype.forEachBranch = function (callback) {
            var $scope = this.$scope;
            (function walkTree(data, parent) {
                angular.forEach(data, function (branch) {
                    var isBreak = callback(branch, parent);
                    if (!isBreak) {
                        if (!angular.isArray(data[$scope.options.itemsLabel])) {
                            data[$scope.options.itemsLabel] = [];
                        } else if (data[$scope.options.itemsLabel].length) {
                            walkTree(data[$scope.options.itemsLabel], data);
                        }
                    }
                });
            })($scope.treeData, null);
        };

        TreeGeneralService.prototype.forEachChild = function (b, callback, deep) {
            var $scope = this.$scope;
            var self = this;
            angular.forEach(b[$scope.options.itemsLabel], function (c) {
                var isBreak = callback(c, b);
                if (deep && c[$scope.options.itemsLabel] && c[$scope.options.itemsLabel].length && !isBreak) {
                    self.forEachChild(c, callback, deep);
                }
            });
        };


        TreeGeneralService.prototype.applyTreeFilter = function () {
            var $scope = this.$scope;
            if ($scope.callbacks.treeFilter) {
                $scope.callbacks.treeFilter($scope.treeData);
            }
        };

        TreeGeneralService.prototype.applyTreeSort = function () {
            var $scope = this.$scope;
            $scope.treeData.sort($scope.callbacks.treeSort);
            this.forEachBranch(function (branch) {
                branch[$scope.options.itemsLabel].sort($scope.callbacks.treeSort);
            });
        };

        /**
         *
         * @param branch
         * @param parent
         */
        TreeGeneralService.prototype.initBranch = function (branch, parent) {
            var $scope = this.$scope;
            branch._uid = $scope.options.modelKey ? branch[$scope.options.modelKey] : UtilService.generateUUID();
            branch._pid = parent ? parent._uid : '';
            branch._level = parent ? parent._level : 0;
            //branch._index = !parent ? ;
            branch._expanded = typeof branch._expanded === 'undefined' ? branch._level < $scope.options.expandLevel : branch._expanded;
            branch._visible = !parent ? branch._visible : parent._visible && parent._expanded;

            branch.getLabel = $scope.callbacks.getBranchLabel ? $scope.callbacks.getBranchLabel() : function () {
                return this.model[$scope.options.label];
            };
            branch.getTreeIcon = function () {
                return this._expanded ? $scope.icons.iconCollapse : $scope.icons.iconExpand;
            };
            branch.getParent = function () {
                return parent;
            };

            branch.getNextBranch = function () {
                if (parent) {
                    if (parent[branch._index + 1]) {
                        return parent[branch._index + 1];
                    } else {
                        return parent;
                    }
                } else {
                    return $scope.treeData[branch._index + 1];
                }
            };

            branch.getPrevBranch = function () {
                if (parent) {
                    if (parent[branch._index - 1]) {
                        return parent[branch._index - 1];
                    } else {
                        return parent;
                    }
                } else {
                    return $scope.treeData[branch._index - 1];
                }
            };

            if ($scope.callbacks.initBranch) {
                $scope.callbacks.initBranch(branch);
            }

            if (branch._selected) {
                $scope.selectedBranches[branch._uid] = branch;
            }

            return branch;
        };


        TreeGeneralService.prototype.init = function () {
            var self = this;

            this.applyTreeFilter();

            this.forEachBranch(function (branch, parent) {
                self.initBranch(branch, parent);
            });

            this.applyTreeSort();
        };

        /**
         * ****************** internal functions ******************
         */

        /**
         TreeGeneralService.prototype.scrollEnd = function () {
            var $scope = this.$scope;
            if ($scope.callbacks.loadMore) {
                $scope.callbacks.loadMore();
            }
        };

         TreeGeneralService.prototype.setSwitch = function (branch) {
            var $scope = this.$scope;
            if ($scope.rowSwitch()) {
                ($scope.rowSwitch())(branch);
            }
        };

         TreeGeneralService.prototype.setRow = function (branch) {
            var $scope = this.$scope;
            if ($scope.rowInit()) {
                ($scope.rowInit())(branch);
            }
        };
         **/


        TreeGeneralService.prototype.onColResizeStart = function ($event, $index) {
            var $scope = this.$scope;
            $scope.resizingColIndex = $index;
            $scope.resizeStartX = $event.screenX;
            angular.element(document).mousemove($scope.onMouseMove);
            angular.element(document).mouseup($scope.onMouseUp);
            return false;
        };


        TreeGeneralService.prototype.onMouseMove = function ($event) {
            var $scope = this.$scope;
            if ($scope.resizingColIndex !== null) {
                var resizedWidth = ($event.screenX - $scope.resizeStartX);
                $scope.resizeStartX = $event.screenX;
                this.setCellWidth(resizedWidth);
            }
            return false;
        };


        TreeGeneralService.prototype.onMouseUp = function (event) {
            var $scope = this.$scope;
            $(document).off('mousemove', $scope.onMouseMove);
            $(document).off('mouseup', $scope.onMouseUp);
            if ($scope.resizingColIndex !== null) {
                var resizedWidth = (event.screenX - $scope.resizeStartX);
                this.setCellWidth(resizedWidth);
            }
            $scope.resizingColIndex = null;
            return false;
        };


        TreeGeneralService.prototype.cellStyle = function (index, isLastCell, isHeaderCell) {
            var $scope = this.$scope;
            if (index === 0) {
                var left = 0;
                for (var i = 0; i < $scope.colDefs.length; i++) {
                    var style = {};
                    style.width = $scope.colDefs[i].width;
                    style.cursor = $scope.resizingColIndex !== null ? 'col-resize' : 'pointer';
                    style['text-align'] = $scope.colDefs[i].align ? $scope.colDefs[i].align : (isHeaderCell ? 'center' : 'left');

                    if (isLastCell) {
                        //style['border-right'] = 'none';
                    }
                    if (i > 0) {
                        left += parseFloat(scope.colDefs[i - 1].width);
                    }
                    style['left'] = left + 'px';
                    $scope.colDefs[i].cellStyle = style;
                }
            }

            return $scope.colDefs[index].cellStyle;
        };

        TreeGeneralService.prototype.cellStyleInner = function (index) {
            var $scope = this.$scope;
            var style = {};
            style.width = ($scope.colDefs[index].width - 11) + 'px';
            style.cursor = $scope.resizingColIndex !== null ? 'col-resize' : 'pointer';
            style.display = 'block';
            style['text-align'] = $scope.colDefs[index].align ? $scope.colDefs[index].align : 'left';

            return style;
        };


        TreeGeneralService.prototype.rowStyle = function (index) {
            var $scope = this.$scope;
            var style = {};
            style.top = (index * $scope.cellHeight) + 'px';
            style.height = $scope.cellHeight;
            return style;
        };

        TreeGeneralService.prototype.rowClass = function (odd, selected) {
            return (odd ? 'table-grid-row-odd' : 'table-grid-row-even') + (selected ? ' active' : '');
        };

        TreeGeneralService.prototype.levelStyle = function (level) {
            var style = {};
            style.left = ((level - 1) * 20) + 'px';
            return style;
        };

        TreeGeneralService.prototype.preventDefault = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
        };

        TreeGeneralService.prototype.hasVisibleChildren = function (branch) {
            var $scope = this.$scope;
            if (!branch[$scope.options.itemsLabel] || !branch[$scope.options.itemsLabel].length) {
                branch._hasChildren = false;
                return false;
            }

            for (var i=0; i<branch[$scope.options.itemsLabel].length; i++) {
                if (branch[$scope.options.itemsLabel][i]._visible_ && branch[$scope.options.itemsLabel][i]._visible) {
                    branch._hasChildren = true;
                    return true;
                }
            }

            return false;
        };

        //-----------------------------------------------------
        /**
         * TODO
         */
        TreeGeneralService.prototype.tableStyle = function () {
            var $scope = this.$scope;
            var style = {};
            if (scope.isFullWidth) {
                style['overflow-x'] = 'hidden';
            }
            if (scope.options['excludeBorder']) {
                style['border'] = 'none';
            }
            return style;
        };

        TreeGeneralService.prototype.getCanvasHeight = function () {
            return {'height': scope.treeRowsFiltered.length * scope.defaultCellHeight, 'width': '100%'};
        };

        TreeGeneralService.prototype.isInViewport = function (index) {
            var $scope = this.$scope;
            return index >= $scope.viewportTop && index <= $scope.viewportBottom;
        };

        TreeGeneralService.prototype.getCanvasHeight = function () {
            var $scope = this.$scope;
            return {height: $scope.treeRowsFiltered.length * $scope.options.cellHeight, width: '100%'};
        };


        return TreeGeneralService;
    }]);
})();