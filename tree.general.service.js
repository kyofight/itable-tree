'use strict';

(function () {
    angular.module('iTableTree').factory('TreeGeneralService', TreeGeneralService);

    function TreeGeneralService ($scope) {
        this.$scope = $scope;
    }


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
                    (function adjustCols(wrapperWidth, gtMinWidthCols) {
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
                            adjustCols(wrapperWidth, remainingCols);
                        } else {
                            for (var f = 0; f < gtMinWidthCols.length; f++) {
                                gtMinWidthCols[f].width = wrapperWidth * colWidthRatios[f];
                            }
                        }
                    })(wrapperWidth, $scope.colDefs);
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
            for (var i = 0; i < $scope.colDefs.length; i++) {
                if ($scope.resizingCol.$$hashKey === $scope.colDefs[i].$$hashKey) {
                    var col = $scope.colDefs[i + 1];
                    var newWidth = (parseFloat(resizingCol['width']) + diffWidth);
                    if (newWidth < resizingCol['minWidth']) {
                        // = resizingCol['minWidth'] + diffWidth;
                        //resizingCol['width'] = resizingCol['minWidth'];
                    } else {
                        //var curw = col['width'];
                        var nw = col['width'] - diffWidth;
                        if (nw < col['minWidth']) {
                            //diffWidth = curw - col['minWidth'];
                            //col['width'] = col['minWidth'];
                            //resizingCol['width'] -= diffWidth;
                        } else {
                            col['width'] = nw;
                            resizingCol['width'] = newWidth;
                        }
                    }
                    break;
                }
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
                    angular.forEach(data[$scope.options.itemsLabel], function () {
                        walkTree(data[$scope.options.itemsLabel], data, level + 1, (visible || !parent) && branch.expanded);
                    });
                }
            });
        })($scope.treeData, null, 0, true);
    };


    /**
     * set the branch
     * @param branch
     */
    TreeGeneralService.prototype.initBranch = function (branch) {
        var $scope = this.$scope;
        if ($scope.callbacks.initBranch) {
            $scope.callbacks.initBranch(branch);
        }
    };


    TreeGeneralService.prototype.init = function () {
        var $scope = this.$scope;
        $scope.treeRows = [];

        $scope.forEachBranch(function (branch, parent, level, visible) {
            branch.uid = UtilService.generateUUID();
            branch.pid = parent ? parent.uid : '';

            branch.level = level;

            if (typeof branch.expanded === 'undefined') {
                branch.expanded = branch.level < $scope.options.expandLevel;
            }

            if (!$scope.callbacks.treeFilter) {
                branch.visible_ = true;
                branch._visible_ = !parent ? true : visible;
            }


            $scope.initBranch(branch);

            $scope.treeRows.push({
                level: level,
                branch: branch,
                label: function () {
                    return this.branch[$scope.options.label];
                },
                treeIcon: function () {
                    return this.branch.expanded ? $scope.icons.iconCollapse : $scope.icons.iconExpand;
                }
            });
        });

        if ($scope.callbacks.treeFilter) {
            $scope.callbacks.treeFilter($scope.treeData);
        }
    };

    /**
     * ****************** internal functions ******************
     */


    TreeGeneralService.prototype.toggleCheckboxes = function ($event) {
        var $scope = this.$scope;
        var action = $event.target.checked;
        angular.forEach($scope.treeRows, function (row) {
            if (row.branch.selected !== action) {
                $scope.branchClicked({}, row.branch, {isMultiple: true});
            }
        });
    };

    TreeGeneralService.prototype.scrollEnd = function () {
        var $scope = this.$scope;
        if ($scope.loadMore()) {
            ($scope.loadMore())();
        }
    };


    TreeGeneralService.prototype.setSwitch = function (branch) {
        var $scope = this.$scope;
        if ($scope.rowSwitch()) {
            ($scope.rowSwitch())(branch);
        }
    };


    /** @expose */
    TreeGeneralService.prototype.setRow = function (branch) {
        var $scope = this.$scope;
        if ($scope.rowInit()) {
            ($scope.rowInit())(branch);
        }
    };

    /** @expose */
    TreeGeneralService.prototype.onColResizeStart = function ($event, col) {
        var $scope = this.$scope;
        $scope.resizingCol = col;
        $scope.resizeStartX = $event.screenX;
        angular.element(document).mousemove($scope.onMouseMove);
        angular.element(document).mouseup($scope.onMouseUp);
        return false;
    };

    /** @expose */
    TreeGeneralService.prototype.onMouseMove = function ($event) {
        var $scope = this.$scope;
        if ($scope.resizingCol) {
            var resizedWidth = ($event.screenX - $scope.resizeStartX);
            $scope.resizeStartX = $event.screenX;
            if (isPercentageWidth) {
                UtilService.setPercentageWidth($scope, resizedWidth);
            }
            if (!$scope.$root.$$phase) {
                $scope.$digest();
            }
        }
        return false;
    };
    /** @expose */
    TreeGeneralService.prototype.onMouseUp = function (event) {
        var $scope = this.$scope;
        $(document).off('mousemove', $scope.onMouseMove);
        $(document).off('mouseup', $scope.onMouseUp);
        if (resizingCol) {
            var resizedWidth = (event['screenX'] - resizeStartX);
            if (isPercentageWidth) {
                setPercentageWidth(resizedWidth);
            }
        }
        if (!$scope.$root.$$phase) {
            $scope.$digest();
        }
        resizingCol = null;
        return false;
    };


    return TreeGeneralService;

})();