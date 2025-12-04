// main.js - V5.2 Final Fix (Interactive & Layout)
let globalData = [];

// 🚨 核心修正：增大底部 margin (40 -> 70)，防止 X 轴文字被切掉
// 增大左侧 margin (50 -> 60)，防止 Y 轴文字贴边
const margin = { top: 20, right: 30, bottom: 70, left: 60 };

const colorPalette = {
    "Action": "#ec4899", "Indie": "#06b6d4", "RPG": "#a855f7",
    "Strategy": "#f59e0b", "Adventure": "#10b981", "Other": "#475569"
};

async function init() {
    // 1. 加载数据
    const data = await d3.json("steam_data_sampled.json");
    globalData = data;
    
    // 2. 动画
    d3.select("#game-count").transition().duration(1000).tween("text", function() {
        const i = d3.interpolateRound(0, data.length);
        return function(t) { this.textContent = `INDEXING ${i(t)} ENTITIES`; };
    });
    
    // 3. 绘图
    drawScatterPlot(data);
    drawTrendChart(data);
    drawTagChart(data);

    // 4. 键盘监听：Shift 键切换穿透模式
    window.addEventListener("keydown", function(event) {
        if (event.key === "Shift") {
            const checkbox = document.getElementById("inspect-mode");
            if (checkbox) checkbox.checked = true;

            // 开启穿透：应用 CSS 规则禁用 pointer-events
            d3.select(".brush").classed("brush-disabled", true);
            d3.select("body").classed("is-inspecting", true);
        }
    });

    window.addEventListener("keyup", function(event) {
        if (event.key === "Shift") {
            const checkbox = document.getElementById("inspect-mode");
            if (checkbox) checkbox.checked = false;

            // 关闭穿透
            d3.select(".brush").classed("brush-disabled", false);
            d3.select("body").classed("is-inspecting", false);
        }
    });

    // 5. Resize
    window.addEventListener("resize", () => {
        drawScatterPlot(globalData);
        drawTrendChart(globalData);
        drawTagChart(globalData);
    });
}

function getColor(genreList) {
    if (!genreList || genreList.length === 0) return colorPalette["Other"];
    const mainGenre = genreList.find(g => colorPalette[g]);
    return mainGenre ? colorPalette[mainGenre] : colorPalette["Other"];
}

// --- Scatter Plot ---
function drawScatterPlot(data) {
    const container = d3.select("#chart-scatter");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.selectAll("*").remove();

    const svg = container.append("svg").attr("width", width).attr("height", height);

    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    defs.append("clipPath").attr("id", "chart-area-clip").append("rect")
        .attr("width", innerWidth).attr("height", innerHeight).attr("x", 0).attr("y", 0);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, 80]).range([0, innerWidth]).clamp(true);
    const yScale = d3.scaleLinear().domain([0.15, 1]).range([innerHeight, 0]).clamp(true);
    const rScale = d3.scaleSqrt().domain([0, 50000]).range([2, 12]).clamp(true);

    const gridX = d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat("").ticks(8);
    const gridY = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat("").ticks(5);
    g.append("g").attr("class", "axis grid").attr("transform", `translate(0,${innerHeight})`)
        .call(gridX).selectAll("line").attr("stroke", "rgba(148, 163, 184, 0.05)");
    g.append("g").attr("class", "axis grid").call(gridY)
        .selectAll("line").attr("stroke", "rgba(148, 163, 184, 0.05)");

    const scatterLayer = g.append("g").attr("id", "scatter-circles").attr("clip-path", "url(#chart-area-clip)");
    const tooltip = d3.select("#tooltip");

    const circles = scatterLayer.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => xScale(d.price)).attr("cy", d => yScale(d.positive_rate))
        .attr("r", d => rScale(d.total_ratings)).attr("fill", d => getColor(d.genres))
        .attr("opacity", 0.7).style("mix-blend-mode", "screen")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "#fff").attr("stroke-width", 2);
            tooltip.style("opacity", 1).style("left", (event.pageX + 20) + "px").style("top", (event.pageY - 20) + "px")
                .html(`<div style="font-weight:bold; color:#fff; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:4px;">${d.name}</div><div style="font-size:11px; color:#cbd5e1;">Price: $${d.price} | Rate: ${(d.positive_rate*100).toFixed(0)}%</div>`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", "none");
            tooltip.style("opacity", 0);
        });

    const axisX = d3.axisBottom(xScale).tickFormat(d => `$${d}`).ticks(8).tickSize(0).tickPadding(15);
    const axisY = d3.axisLeft(yScale).tickFormat(d => d * 100 + "%").ticks(5).tickSize(0).tickPadding(10);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(axisX).select(".domain").remove();
    g.append("g").attr("class", "axis").call(axisY).select(".domain").remove();

    svg.append("text").attr("class", "axis-label").attr("x", width - margin.right).attr("y", height - 5).attr("text-anchor", "end").attr("fill", "#94a3b8").style("font-size", "10px").style("font-weight", "bold").text("PRICE (USD) →");
    svg.append("text").attr("class", "axis-label").attr("x", margin.left).attr("y", margin.top - 5).attr("text-anchor", "start").attr("fill", "#94a3b8").style("font-size", "10px").style("font-weight", "bold").text("↑ POSITIVE RATING (%)");

    const brush = d3.brush().extent([[0, 0], [innerWidth, innerHeight]]).on("start brush end", brushed);
    g.append("g").attr("class", "brush").call(brush);

    function brushed(event) {
        if (!event.selection) {
            circles.attr("opacity", 0.7).style("fill", d => getColor(d.genres));
            drawTrendChart(globalData); drawTagChart(globalData);
            d3.select("#game-count").text(`INDEXING ${globalData.length} ENTITIES`);
            return;
        }
        const [[x0, y0], [x1, y1]] = event.selection;
        const priceMin = xScale.invert(x0), priceMax = xScale.invert(x1);
        const rateMax = yScale.invert(y0), rateMin = yScale.invert(y1);
        const filteredData = globalData.filter(d => d.price >= priceMin && d.price <= priceMax && d.positive_rate >= rateMin && d.positive_rate <= rateMax);
        circles.attr("opacity", 0.1).style("fill", "#555");
        circles.filter(d => d.price >= priceMin && d.price <= priceMax && d.positive_rate >= rateMin && d.positive_rate <= rateMax)
            .attr("opacity", 1).style("fill", d => getColor(d.genres));
        drawTrendChart(filteredData); drawTagChart(filteredData);
        d3.select("#game-count").text(`SELECTED ${filteredData.length} / ${globalData.length}`);
    }
}

// --- Data Process ---
function processTrendData(data) {
    const recentData = data.filter(d => d.year >= 2010 && d.year <= 2024);
    const years = Array.from(new Set(recentData.map(d => d.year))).sort((a, b) => a - b);
    const genreTotals = {};
    const genres = Object.keys(colorPalette).filter(k => k !== "Other");
    genres.forEach(g => genreTotals[g] = 0);
    const processed = years.map(year => {
        const yearGames = recentData.filter(d => d.year === year);
        const obj = { year: year };
        genres.forEach(genre => {
            const count = yearGames.filter(d => d.genres.includes(genre)).length;
            obj[genre] = count;
            genreTotals[genre] += count;
        });
        return obj;
    });
    const sortedKeys = genres.sort((a, b) => genreTotals[b] - genreTotals[a]);
    return { processedData: processed, keys: sortedKeys };
}

// --- Trend Chart ---
function drawTrendChart(data) {
    const container = d3.select("#chart-trend");
    if (!data || data.length === 0) {
        container.html("<div style='display:flex;justify-content:center;align-items:center;height:100%;color:#64748b;'>NO DATA SELECTED</div>"); return;
    }
    const width = container.node().clientWidth, height = container.node().clientHeight;
    if (height <= 0) return;
    const marginLocal = { top: 25, right: 10, bottom: 20, left: 35 };
    const innerWidth = width - marginLocal.left - marginLocal.right, innerHeight = height - marginLocal.top - marginLocal.bottom;
    
    container.selectAll("*").remove();
    const svg = container.append("svg").attr("width", width).attr("height", height).style("display", "block");
    
    const { processedData, keys } = processTrendData(data);
    if (processedData.length === 0) { container.html("<div style='height:100%;display:grid;place-items:center;color:#555;'>No trend data</div>"); return; }
    
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetNone);
    const series = stack(processedData);
    const g = svg.append("g").attr("transform", `translate(${marginLocal.left},${marginLocal.top})`);
    
    const xExtent = d3.extent(processedData, d => d.year);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
    const yMax = d3.max(series, s => d3.max(s, d => d[1])) || 10;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerHeight, 0]);
    const area = d3.area().x(d => xScale(d.data.year)).y0(d => yScale(d[0])).y1(d => yScale(d[1])).curve(d3.curveMonotoneX);

    const gridY = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat("").ticks(5);
    g.append("g").attr("class", "grid").call(gridY).selectAll("line").attr("stroke", "rgba(255,255,255,0.05)").attr("stroke-dasharray", "2,2");
    g.select(".grid .domain").remove();

    g.selectAll(".layer").data(series).join("path").attr("class", "layer").attr("fill", d => colorPalette[d.key]).attr("d", area).attr("opacity", 0.85).attr("stroke", "none");
    const scannerLine = g.append("line").attr("stroke", "#fff").attr("stroke-width", 1).attr("stroke-dasharray", "3,3").attr("y1", 0).attr("y2", innerHeight).attr("opacity", 0).style("pointer-events", "none");
    
    g.append("rect").attr("width", innerWidth).attr("height", innerHeight).attr("fill", "transparent")
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            if (hoveredYear < xExtent[0] || hoveredYear > xExtent[1]) return;
            scannerLine.attr("x1", xScale(hoveredYear)).attr("x2", xScale(hoveredYear)).attr("opacity", 1);
            const yearData = processedData.find(d => d.year === hoveredYear);
            const sortedGenres = Object.entries(yearData).filter(([k]) => k !== 'year').sort((a, b) => b[1] - a[1]).slice(0, 4);
            const tooltip = d3.select("#tooltip");
            let leftPos = event.pageX + 15;
            if (leftPos + 180 > window.innerWidth) leftPos = event.pageX - 195;
            tooltip.style("opacity", 1).style("left", leftPos + "px").style("top", (event.pageY - 10) + "px")
                .html(`<div style="font-weight:bold; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:5px;">📅 ${hoveredYear}</div>${sortedGenres.map(g => `<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;"><span style="color:${colorPalette[g[0]]}">● ${g[0]}</span><span style="color:#fff;">${g[1]}</span></div>`).join('')}<div style="margin-top:4px; font-size:9px; color:#cbd5e1; text-align:right;">Total: ${d3.sum(Object.values(yearData)) - yearData.year}</div>`);
        })
        .on("mouseout", function() { scannerLine.attr("opacity", 0); d3.select("#tooltip").style("opacity", 0); });

    const axisX = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("d")).tickSize(0).tickPadding(8);
    const axisY = d3.axisLeft(yScale).ticks(4).tickFormat(d3.format("~s")).tickSize(0).tickPadding(5);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(axisX).select(".domain").remove();
    g.append("g").attr("class", "axis").call(axisY).select(".domain").remove();
    svg.append("text").attr("x", 5).attr("y", 15).attr("fill", "#64748b").style("font-size", "9px").style("font-weight", "bold").text("NEW RELEASES (COUNT)");
}

// --- Tag Chart ---
function processTagData(data) {
    const counts = {};
    data.forEach(d => { if (d.genres) d.genres.forEach(g => counts[g] = (counts[g] || 0) + 1); });
    return Object.entries(counts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 8);
}

function drawTagChart(data) {
    const container = d3.select("#chart-detail");
    if (!data || data.length === 0) { container.html("<div style='display:flex;justify-content:center;align-items:center;height:100%;color:#64748b;'>NO DATA</div>"); return; }
    const width = container.node().clientWidth, height = container.node().clientHeight;
    if (height <= 0) return;
    container.selectAll("*").remove();
    const processed = processTagData(data);
    if (processed.length === 0) return;

    const marginLocal = { top: 20, right: 30, bottom: 20, left: 80 };
    const innerWidth = width - marginLocal.left - marginLocal.right, innerHeight = height - marginLocal.top - marginLocal.bottom;
    const svg = container.append("svg").attr("width", width).attr("height", height).style("display", "block");
    const g = svg.append("g").attr("transform", `translate(${marginLocal.left},${marginLocal.top})`);
    
    const yScale = d3.scaleBand().domain(processed.map(d => d.tag)).range([0, innerHeight]).padding(0.4);
    const xScale = d3.scaleLinear().domain([0, d3.max(processed, d => d.count)]).range([0, innerWidth]);

    g.selectAll("myline").data(processed).enter().append("line").attr("x1", 0).attr("x2", d => xScale(d.count)).attr("y1", d => yScale(d.tag) + yScale.bandwidth()/2).attr("y2", d => yScale(d.tag) + yScale.bandwidth()/2).attr("stroke", "#334155").attr("stroke-width", 2);
    g.selectAll("mycircle").data(processed).enter().append("circle").attr("cx", d => xScale(d.count)).attr("cy", d => yScale(d.tag) + yScale.bandwidth()/2).attr("r", 6).attr("fill", d => colorPalette[d.tag] || "#cbd5e1").attr("stroke", "#0f172a").attr("stroke-width", 2);
    g.selectAll("mytext").data(processed).enter().append("text").attr("x", d => xScale(d.count) + 12).attr("y", d => yScale(d.tag) + yScale.bandwidth()/2 + 4).text(d => d.count).attr("fill", "#94a3b8").style("font-size", "10px").style("font-family", "monospace");
    
    const axisY = d3.axisLeft(yScale).tickSize(0).tickPadding(10);
    g.append("g").attr("class", "axis").call(axisY).select(".domain").remove();
    g.selectAll(".axis text").style("font-size", "11px").style("font-weight", "bold").style("fill", "#e2e8f0");
    svg.append("text").attr("x", width - 10).attr("y", 15).attr("text-anchor", "end").attr("fill", "#64748b").style("font-size", "9px").style("font-weight", "bold").text("TOP GENRES");
}

function resetBrush() {
    d3.select(".brush").call(d3.brush().move, null);
    d3.select("#scatter-circles").selectAll("circle").transition().duration(500).attr("opacity", 0.7).style("fill", d => getColor(d.genres));
    drawTrendChart(globalData); drawTagChart(globalData);
    d3.select("#game-count").text(`SYSTEM READY`);
}

function toggleInspect(checkbox) {
    d3.select(".brush").classed("brush-disabled", checkbox.checked);
    d3.select("body").classed("is-inspecting", checkbox.checked);
}

init();