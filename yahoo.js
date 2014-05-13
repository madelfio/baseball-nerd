"use strict";

/* jshint browser:true, node:true, sub:true */
/* global d3 */

var cols = [],
    teams = [];

function parse() {
  var table = d3.select('.teamtable');

  table.selectAll('thead tr')
      .each(function(d, i) {
        d3.select(this).selectAll('th')
            .each(function(d2, i2) {cols.push(this.textContent);});
      });

  table.selectAll('tbody tr')
      .each(function(d, i) {
        var team = {};
        d3.select(this).selectAll('td')
            .each(function(d2, i2) {
              team[cols[i2]] = this.textContent;
            });
        teams.push(team);
      });
}


function asc(a, b) {return parseFloat(a) - parseFloat(b);}
function desc(a, b) {return parseFloat(b) - parseFloat(a);}


function rotoRank(vals, comp) {
  var _rotoRank = {},
      lookup = {};

  comp = comp || asc;

  (function rotoMap(vals, comp) {
    var sortedVals = vals.slice(0).sort(comp);
    var sums = {},
        counts = {};
    sortedVals.forEach(function(v, i) {
      sums[v] = (sums[v] || 0) + (i+1);
      counts[v] = (counts[v] || 0) + 1;
    });
    for (var i in sums) {
      lookup[i] = sums[i] / counts[i];
    }
  })(vals, comp);

  _rotoRank.ranks = function() {
    return vals.map(function(v) {return lookup[v];});
  };

  return _rotoRank;
}


function process() {
  function lowIsGood(c) {return ['ERA', 'WHIP'].indexOf(c) >= 0;}

  cols.forEach(function(c, i) {
    var vals, ranks, order;
    if (i === 0) {return;}
    order = lowIsGood(c) ? desc : asc;

    vals = teams.map(function(t) {return t[c];});
    ranks = rotoRank(vals, order).ranks();
    teams.forEach(function(t, j) {
      t[c + '_val'] = t[c];
      t[c] = ranks[j];
    });
  });

  teams.forEach(function(t) {
    t['Total'] = d3.sum(cols, function(c) {return t[c];});
  });
  cols.push('Total');
  teams.sort(function(a, b) {return b['Total'] - a['Total'];});
}


function render() {
  // gracefully remove old table if one already exists
  if (document.getElementById('yahoo-bookmarklet')) {
    d3.select('body').selectAll('#yahoo-bookmarklet')
      .transition()
      .ease('linear')
      .style('left', '-400px')
      .style('bottom', '-300px')
      .each('end', function() {d3.select('#yahoo-bookmarklet').remove(); render();});
      return;
  }

  // add padding to bottom of page to ensure page is visible behind popup
  d3.select('#doc4').style('margin-bottom', '200px');

  var div = d3.select('body')
    .append('div')
      .attr('id', 'yahoo-bookmarklet')
      .style('border-top', '2px solid #bbb')
      .style('border-right', '2px solid #bbb')
      .style('position', 'fixed')
      .style('left', '-400px')
      .style('bottom', '-300px')
      .style('z-index', 100)
      .style('background-color', '#ddd')
      .style('padding', '3px')
      .style('border-top-right-radius', '4px');

  div.transition().duration(1000)
      .style('bottom', '0px')
      .style('left', '0px');

  var roto_table = div.append('table');

  roto_table.append('tr')
      .selectAll('td')
      .data(cols).enter()
    .append('td')
      .text(function(d, i) {return d;})
      .style('padding', '2px 6px')
      .style('font-weight', 'bold');

  roto_table.selectAll('tr.data')
      .data(teams).enter()
    .append('tr')
      .attr('class', 'data')
      .each(function(d, i) {
        var r = d3.select(this);
        cols.forEach(function(c, j) {
          r.append('td')
            .text(d[c])
            .style('padding', '2px 6px')
            .style('font-weight', ['Total', 'Team Name'].indexOf(c) >= 0 ? 'bold' : '')
            .style('text-align', j > 0 ? 'right' : '');
        });
      });
}


// run tests if running from node.js
if (typeof module !== 'undefined' && module.exports && require.main === module) {
  var assert = require('assert');
  assert.deepEqual(rotoRank([1, 9, 11, 102]).ranks(), [1, 2, 3, 4]);
  assert.deepEqual(rotoRank(['116', '99', '57', '94']).ranks(), [4, 3, 1, 2]);
  assert.deepEqual(rotoRank(['7', '5', '10', '8', '8', '9', '10', '7', '9']).ranks(),
                            [2.5, 1, 8.5, 4.5, 4.5, 6.5, 8.5, 2.5, 6.5]);
  console.log('all tests passed');
} else {
  var delay = 100;

  var setup = function() {
    if (typeof d3 !== 'undefined') {
      if (document.getElementById('headtohead-stats')) {
        parse();
        process();
        render();
      }
    } else {
      delay *= 2;
      setTimeout(setup, delay);
    }
  };

  setup();
}
