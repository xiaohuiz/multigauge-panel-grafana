'use strict';

System.register(['app/plugins/sdk', 'app/core/time_series2', 'lodash', './gauge'], function (_export, _context) {
  "use strict";

  var MetricsPanelCtrl, TimeSeries, _, directive_gauge, _createClass, panelDefaults, MultiGaugeCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_appCoreTime_series) {
      TimeSeries = _appCoreTime_series.default;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_gauge) {
      directive_gauge = _gauge.directive_gauge;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      panelDefaults = {
        links: [],
        datasource: null,
        maxDataPoints: 3,
        interval: null,
        targets: [{}],
        cacheTimeout: null,
        measures: {
          pointer: { name: '', target: '', thresholds: "0,100", valueName: 'avg' },
          water_mark: { name: '', target: '', thresholds: "0,1", valueName: 'avg', value_as_space: false },
          temperature: { name: '', target: '', thresholds: "0,1", valueName: 'avg' },
          indicators: [],
          series_names: []
        },
        multigauge: { config: {}, data: {}, indicators: [] }
        //{size:200, color_scale: {name:ctrl.panel.data.temperature.name, min:ctrl.panel.data.temperature.min, max:ctrl.panel.data.temperature.max}, util_scale: {name:ctrl.panel.data.water_mark.name, min:ctrl.panel.data.water_mark.min, max:ctrl.panel.data.water_mark.max}, measure: {name:ctrl.panel.data.pointer.name, min:ctrl.panel.data.pointer.min, max:ctrl.panel.data.pointer.max}}
        //{color_scale:ctrl.panel.data.temperature.value, util_scale:ctrl.panel.data.water_mark.value, measure:ctrl.panel.data.pointer.value}
        //data:{pointer:{},water_mark:{},temperature:{},indicators:[]}
      };


      //register the directive
      angular.module('grafana.directives').directive('gauge', ['$timeout', directive_gauge]);

      _export('PanelCtrl', MultiGaugeCtrl = function (_MetricsPanelCtrl) {
        _inherits(MultiGaugeCtrl, _MetricsPanelCtrl);

        function MultiGaugeCtrl($scope, $injector, $rootScope) {
          _classCallCheck(this, MultiGaugeCtrl);

          var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MultiGaugeCtrl).call(this, $scope, $injector));

          _this.$rootScope = $rootScope;
          _.defaults(_this.panel, panelDefaults);
          _this.valueNameOptions = ['avg', 'current', 'min', 'max', 'total'];

          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('data-error', _this.onDataError.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          return _this;
        }

        _createClass(MultiGaugeCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/grafana-multigauge-panel/editor.html', 2);
            //this.unitFormats = kbn.getUnitFormats();
          }
        }, {
          key: 'onDataError',
          value: function onDataError(err) {
            this.onDataReceived([]);
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            this.dataList = dataList;
            this.refreshData();
          }
        }, {
          key: 'refreshData',
          value: function refreshData() {
            var _this2 = this;

            this.panel.measures.series_names = _.size(this.dataList) > 0 ? _.map(this.dataList, function (s) {
              return s.target;
            }) : [];
            _.each(['pointer', 'water_mark', 'temperature'], function (m) {
              var c = _this2.getData(_this2.panel.measures[m], _this2.dataList)[0];
              _this2.panel.multigauge.config[m] = c;
              _this2.panel.multigauge.data[m] = c.value;
            });
            this.panel.multigauge.indicators = [];
            _.each(this.panel.measures['indicators'], function (m) {
              var matched_series = _this2.getData(m, _this2.dataList); //add all indicators regardless having data or not
              _this2.panel.multigauge.indicators = _this2.panel.multigauge.indicators.concat(matched_series);
            });
            this.$timeout(this.render.bind(this));
          }
        }, {
          key: 'getData',
          value: function getData(measure, series) {
            var _this3 = this;

            //var measure=this.panel.measures[measure_name];
            var _re = measure.target.match(/^\/(.+)\/$/);
            var re = new RegExp(_re ? _re[1] : '^' + measure.target + '$');
            var matched_series = _.filter(series, function (s) {
              return s.target.search(re) >= 0;
            });
            if (_.size(matched_series) > 0) {
              return _.map(matched_series, function (s) {
                return _this3.combineMetaAndData(measure, s);
              });
            } else {
              return [this.combineMetaAndData(measure)];
            }
          }
        }, {
          key: 'combineMetaAndData',
          value: function combineMetaAndData(measure, series) {
            var v = _.assign({
              min: +measure.thresholds.split(',')[0],
              max: +measure.thresholds.split(',')[1],
              value: null
            }, measure);
            if (v.name == '') v.name = v.target;
            if (series && series.target != undefined) v.target = series.target;
            if (series && _.size(series.datapoints) > 0) {
              var ts = new TimeSeries({ datapoints: series.datapoints, alias: series.target });
              ts.flotpairs = ts.getFlotPairs();
              v.value = Math.round(100 * ts.stats[measure.valueName]) / 100;
            }
            return v;
          }
        }, {
          key: 'addIndicator',
          value: function addIndicator() {
            this.panel.measures.indicators.push({ name: '', target: '', thresholds: '' });
          }
        }, {
          key: 'removeIndicator',
          value: function removeIndicator(indicator) {
            _.remove(this.panel.measures.indicators, indicator);
            this.refreshData();
          }
        }]);

        return MultiGaugeCtrl;
      }(MetricsPanelCtrl));

      MultiGaugeCtrl.templateUrl = 'module.html';

      _export('PanelCtrl', MultiGaugeCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
