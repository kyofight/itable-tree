'use strict';

(function () {
    angular.module('iTableTree').service('UtilService', UtilService);

    function UtilService () {

    }

    UtilService.prototype.generateUUID = function () {
        var d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
    };

    UtilService.prototype.getScrollBarWidth = function () {
        var inner = document.createElement('p');
        inner.style.width = '100%';
        inner.style.height = '200px';

        var outer = document.createElement('div');
        outer.style.position = 'absolute';
        outer.style.top = '0px';
        outer.style.left = '0px';
        outer.style.visibility = 'hidden';
        outer.style.width = '200px';
        outer.style.height = '150px';
        outer.style.overflow = 'hidden';
        outer.appendChild(inner);

        document.body.appendChild(outer);
        var w1 = inner.offsetWidth;
        outer.style.overflow = 'scroll';
        var w2 = inner.offsetWidth;
        if (w1 === w2) {
            w2 = outer.clientWidth;
        }

        document.body.removeChild(outer);

        return (w1 - w2);
    };

    UtilService.prototype.setContainerWidth = function ($scope) {
        if ($scope.containerWidth < $scope.options.minWidth) {
            $scope.containerWidth = $scope.options.minWidth;
            $scope.isFullWidth = false;
        } else {
            $scope.isFullWidth = true;
        }
    };

    UtilService.prototype.reCalculateWidth = function (w, totalWidth, totalCount, diffWidth) {
        if (resizingCol && isPercentageWidth && diffWidth) {
            for (var i = 0; i < $scope.colDefs.length; i++) {
                if (resizingCol['$$hashKey'] === $scope.colDefs[i]['$$hashKey']) {
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
            //setPercentageWidth();
        } else {
            _.each($scope.colDefs, function (col) {
                col['width'] = (col['width'] / totalWidth) * w;
            });
        }
    };


    UtilService.prototype.setCellWidth = function ($scope, diffWidth) {
        var totalCount = 0;
        var treeWidth = 0;
        angular.forEach($scope.colDefs, function (col) {
            treeWidth += col['width'];
            totalCount++;
        });
        var w = $scope.containerWidth;
        var hasScrollBar = false;
        var body = angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body');
        if (body.length && body[0]) {
            hasScrollBar = body.get(0).scrollHeight >= body.outerHeight();
            w = hasScrollBar ? (w - $scope.scrollbarWidth) : w;
        }

        if (diffWidth === undefined) {
!!!stops here
            var realWidth = newWidth - (hasScrollBar ? scrollbarWidth : 0);

            (function adjustCols(realWidth, gtMinWidthCols) {
                var totalColWidth = 0;
                _.each(gtMinWidthCols, function (col) {
                    totalColWidth += col['width'];
                });

                var colWidthRatios = _.map(gtMinWidthCols, function (col) {
                    return col['width'] / totalColWidth;
                });

                var indexes = [];
                for (var c = 0; c < gtMinWidthCols.length; c++) {
                    var col = gtMinWidthCols[c];
                    var nw = realWidth * colWidthRatios[c];
                    if (nw < col['minWidth']) {
                        col['width'] = col['minWidth'];
                        realWidth -= col['minWidth'];
                        indexes.push(c);
                    }
                }
                if (indexes.length > 0) {
                    adjustCols(realWidth, _.filter(gtMinWidthCols, function (val, key) {
                        return _.indexOf(indexes, key) === -1;
                    }));
                } else {
                    for (var f = 0; f < gtMinWidthCols.length; f++) {
                        gtMinWidthCols[f]['width'] = realWidth * colWidthRatios[f];
                    }
                }
            })(realWidth, $scope.colDefs);
        } else {
            reCalculateWidth(w, treeWidth, totalCount, diffWidth);
        }

        viewpointElement = angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body');

        if ($scope.$root && !$scope.$root.$$phase) {
            $scope.$digest();
        }
    };

})();