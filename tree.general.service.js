'use strict';

(function () {
    angular.module('iTableTree').factory('TreeGeneralService', ['UtilService', function (UtilService) {
        function TreeGeneralService ($scope) {
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
            (function walkTree(data, parent, level, visible) {
                angular.forEach(data, function (branch) {
                    callback(branch, parent, level, visible);
                    if (!angular.isArray(data[$scope.options.itemsLabel])) {
                        data[$scope.options.itemsLabel] = [];
                    } else if (data[$scope.options.itemsLabel].length) {
                        walkTree(data[$scope.options.itemsLabel], data, level + 1, (visible || !parent) && branch.expanded_);
                    }
                });
            })($scope.treeData, null, 0, true);
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
            $scope.forEachBranch(function (branch) {
                branch[$scope.options.itemsLabel].sort($scope.callbacks.treeSort);
            });
        };

        /**
         *
         * @param branch
         * @param parent
         * @param level
         */
        TreeGeneralService.prototype.getBranch = function (branch, parent, level) {
            var $scope = this.$scope;
            var row = {};
            row.model = branch;
            row.uid = this.options.modelKey ? branch[this.options.modelKey] : UtilService.generateUUID();
            row.pid = parent ? parent.uid : '';
            row.level = level;
            row.expanded = function () {
                return this.model.expanded_;
            };
            row.visible_ = function () {
                return this.model.visible_;
            };
            row._visible_ = function () {
                return this.model._visible_;
            };
            row.label = function () {
                return this.model[$scope.options.label];
            };
            row.treeIcon = function () {
                return this.expanded() ? $scope.icons.iconCollapse : $scope.icons.iconExpand;
            };

            if ($scope.callbacks.initBranch) {
                $scope.callbacks.initBranch(row);
            }

            return row;
        };


        TreeGeneralService.prototype.init = function () {
            var $scope = this.$scope;
            var self = this;
            $scope.treeBranches = [];

            this.applyTreeSort();

            $scope.forEachBranch(function (branch, parent, level, visible) {
                branch.expanded_ = level < $scope.options.expandLevel;
                branch.visible = true;
                branch._visible_ = !parent ? true : visible;

                $scope.treeBranches.push(self.getBranch(branch, parent, level));
            });

            this.applyTreeFilter();
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
                        left += parseFloat(scope.colDefs[i-1].width);
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

        TreeGeneralService.prototype.anyVisibleChildren = function (branch) {
            var $scope = this.$scope;
            if (!branch[$scope.options.itemsLabel] || !branch[$scope.options.itemsLabel].length) {
                branch.anyChildren = true;
                return false;
            }
            //1 level traverse only
            var anyVisibleChildren = false;
            angular.forEach(branch[$scope.options.itemsLabel], function (item) {
                if (item.visible_) {
                    anyVisibleChildren = true;
                    return true;
                }
            });
            branch.anyChildren = !anyVisibleChildren;
            return anyVisibleChildren;
        };


        //-----------------------------------------------------
        /**
         * TODO
         */
        TreeGeneralService.prototype.test = function () {
            /** @expose */
            scope.selectedBranches = scope.selectedBranches ? scope.selectedBranches : {};


        }



        return TreeGeneralService;
    }]);
})();