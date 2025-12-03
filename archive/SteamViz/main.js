// main.js - V2.2 Final Fix (No Syntax Errors)
let globalData = [];
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

// 霓虹色板
const colorPalette = {
    "Action": "#ec4899",   // Pink
    "Indie": "#06b6d4",    // Cyan
    "RPG": "#a855f7",      // Purple
    "Strategy": "#f59e0b", // Amber
    "Adventure": "#10b981",// Emerald
    "Other": "#475569"     // Slate
};

async function init() {
    // 1. 加载数据
    const data = await d3.json("steam_data_sampled.json");
    globalData = data;
    
    // 2. 头部计数器动画
    d3.select("#game-count")
        .transition().duration(1000)
        .tween("text", function() {
            const i = d3.interpolateRound(0, data.length);
            return function(t) {
                this.textContent = `INDEXING ${i(t)} ENTITIES`;
            };
        });
    
    // 3. 绘制两个图表
    drawScatterPlot(data);
    drawTrendChart(data); // 确保这一行被执行
    
    // 4. 监听窗口大小变化
    window.addEventListener("resize", () => {
        drawScatterPlot(globalData);
        drawTrendChart(globalData);
    });
}

function getColor(genreList) {
    if (!genreList || genreList.length === 0) return colorPalette["Other"];
    const mainGenre = genreList.find(g => colorPalette[g]);
    return mainGenre ? colorPalette[mainGenre] : colorPalette["Other"];
}


// --- 主图：散点图 (V2.3 Added Labels) ---
function drawScatterPlot(data) {
    const container = d3.select("#chart-scatter");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // ... 滤镜与裁剪 (保持不变) ...
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    defs.append("clipPath")
        .attr("id", "chart-area-clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("x", 0)
        .attr("y", 0);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ... 比例尺 (保持不变) ...
    const xScale = d3.scaleLinear().domain([0, 80]).range([0, innerWidth]).clamp(true);
    const yScale = d3.scaleLinear().domain([0.15, 1]).range([innerHeight, 0]).clamp(true);
    const rScale = d3.scaleSqrt().domain([0, 50000]).range([2, 12]).clamp(true);

    // ... 网格线 (保持不变) ...
    const gridX = d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat("").ticks(8);
    const gridY = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat("").ticks(5);
    g.append("g").attr("class", "axis grid").attr("transform", `translate(0,${innerHeight})`)
        .call(gridX).selectAll("line").attr("stroke", "rgba(148, 163, 184, 0.05)");
    g.append("g").attr("class", "axis grid").call(gridY)
        .selectAll("line").attr("stroke", "rgba(148, 163, 184, 0.05)");

    // ... 散点层 (保持不变) ...
    const scatterLayer = g.append("g").attr("clip-path", "url(#chart-area-clip)");
    const tooltip = d3.select("#tooltip");

    scatterLayer.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.price)) 
        .attr("cy", d => yScale(d.positive_rate))
        .attr("r", d => rScale(d.total_ratings))
        .attr("fill", d => getColor(d.genres))
        .attr("opacity", 0.7)
        .style("mix-blend-mode", "screen")
        .on("mouseover", function(event, d) {
            d3.select(this).transition().duration(200).attr("r", 15).attr("opacity", 1).style("filter", "url(#glow)");
            tooltip.style("opacity", 1)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 20) + "px")
                .html(`
                    <div style="margin-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                        <span style="font-weight:600; color:#fff;">${d.name}</span>
                        <span style="font-size:10px; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; margin-left:5px;">${d.year}</span>
                    </div>
                    <div style="font-size:11px; color:#cbd5e1;">
                        <span style="color:${getColor(d.genres)}">● ${d.genres[0]}</span> | $${d.price} | ${(d.positive_rate * 100).toFixed(0)}%
                    </div>
                `);
        })
        .on("mouseout", function() {
            d3.select(this).transition().duration(300).attr("r", d => rScale(d.total_ratings)).attr("opacity", 0.7).style("filter", null);
            tooltip.style("opacity", 0);
        });

    // ... 坐标轴数值 (保持不变) ...
    const axisX = d3.axisBottom(xScale).tickFormat(d => `$${d}`).ticks(8).tickSize(0).tickPadding(15);
    const axisY = d3.axisLeft(yScale).tickFormat(d => d * 100 + "%").ticks(5).tickSize(0).tickPadding(10);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(axisX).select(".domain").remove();
    g.append("g").attr("class", "axis").call(axisY).select(".domain").remove();

    // =============== 新增：明确的坐标轴标签 ===============
    
    // X轴标签 (右下角)
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width - margin.right)
        .attr("y", height - 5) // 贴底
        .attr("text-anchor", "end") // 右对齐
        .attr("fill", "#94a3b8")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("letter-spacing", "1px")
        .text("PRICE (USD) →");

    // Y轴标签 (左上角)
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", margin.left)
        .attr("y", margin.top - 5) // 放在图表上方一点
        .attr("text-anchor", "start") // 左对齐
        .attr("fill", "#94a3b8")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("letter-spacing", "1px")
        .text("↑ POSITIVE RATING (%)");
}

// --- 数据处理工具 (V3.1 Sorted by Volume) ---
function processTrendData(data) {
    const recentData = data.filter(d => d.year >= 2010 && d.year <= 2024);
    const years = Array.from(new Set(recentData.map(d => d.year))).sort((a, b) => a - b);
    
    // 1. 统计每个类型的总数量，用于排序
    const genreTotals = {};
    const genres = Object.keys(colorPalette).filter(k => k !== "Other");
    
    genres.forEach(g => genreTotals[g] = 0); // 初始化

    const processed = years.map(year => {
        const yearGames = recentData.filter(d => d.year === year);
        const obj = { year: year };
        genres.forEach(genre => {
            const count = yearGames.filter(d => d.genres.includes(genre)).length;
            obj[genre] = count;
            genreTotals[genre] += count; // 累加总量
        });
        return obj;
    });

    // 2. 关键优化：按总量从大到小排序 Key
    // 这样“地基”最厚实，视觉上最稳定
    const sortedKeys = genres.sort((a, b) => genreTotals[b] - genreTotals[a]);

    return { processedData: processed, keys: sortedKeys };
}

// --- 趋势图 (V3.1 With Grid & Better Sorting) ---
function drawTrendChart(data) {
    // 使用新的排序逻辑
    const { processedData, keys } = processTrendData(data);
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetNone);
    const series = stack(processedData);

    const container = d3.select("#chart-trend");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const marginLocal = { top: 25, right: 10, bottom: 20, left: 35 }; // 左侧留宽一点给Y轴数值
    const innerWidth = width - marginLocal.left - marginLocal.right;
    const innerHeight = height - marginLocal.top - marginLocal.bottom;

    container.selectAll("*").remove();

    const svg = container.append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${marginLocal.left},${marginLocal.top})`);

    const xExtent = d3.extent(processedData, d => d.year);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
    const yMax = d3.max(series, s => d3.max(s, d => d[1]));
    
    // Y轴留一点头部空间，不要顶格
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerHeight, 0]);

    const area = d3.area()
        .x(d => xScale(d.data.year))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);

    // --- 新增：Y轴水平网格线 (辅助判断高度) ---
    const gridY = d3.axisLeft(yScale)
        .tickSize(-innerWidth) // 线条贯穿整个图表
        .tickFormat("")
        .ticks(5);
        
    g.append("g")
        .attr("class", "grid")
        .call(gridY)
        .selectAll("line")
        .attr("stroke", "rgba(255,255,255,0.05)") // 极淡的白色
        .attr("stroke-dasharray", "2,2"); // 虚线
    
    g.select(".grid .domain").remove(); // 去掉轴线

    // 绘制波浪
    g.selectAll(".layer")
        .data(series)
        .join("path")
        .attr("class", "layer")
        .attr("fill", d => colorPalette[d.key])
        .attr("d", area)
        .attr("opacity", 0.85) //稍微不透明一点，让颜色更实
        .attr("stroke", "none");

    // 扫描线 (保持 V3.0 的逻辑)
    const scannerLine = g.append("line")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("opacity", 0)
        .style("pointer-events", "none");

    // 交互遮罩
    g.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            
            if (hoveredYear < xExtent[0] || hoveredYear > xExtent[1]) return;

            const xPos = xScale(hoveredYear);
            scannerLine.attr("x1", xPos).attr("x2", xPos).attr("opacity", 1);

            // 获取当年数据并排序用于 Tooltip
            const yearData = processedData.find(d => d.year === hoveredYear);
            const sortedGenres = Object.entries(yearData)
                .filter(([k]) => k !== 'year')
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4); // 显示前4名

            const tooltip = d3.select("#tooltip");
            let leftPos = event.pageX + 15;
            if (leftPos + 180 > window.innerWidth) leftPos = event.pageX - 195;

            tooltip.style("opacity", 1)
                .style("left", leftPos + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`
                    <div style="font-weight:bold; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:5px;">
                        📅 ${hoveredYear}
                    </div>
                    ${sortedGenres.map(g => `
                        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                            <span style="color:${colorPalette[g[0]]}">● ${g[0]}</span>
                            <span style="color:#fff;">${g[1]}</span>
                        </div>
                    `).join('')}
                    <div style="margin-top:4px; font-size:9px; color:#cbd5e1; text-align:right;">
                        Total: ${d3.sum(Object.values(yearData)) - yearData.year}
                    </div>
                `);
        })
        .on("mouseout", function() {
            scannerLine.attr("opacity", 0);
            d3.select("#tooltip").style("opacity", 0);
        });

    // 坐标轴
    const axisX = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("d")).tickSize(0).tickPadding(8);
    // Y轴使用简写数值 (2k, 4k)
    const axisY = d3.axisLeft(yScale).ticks(4).tickFormat(d3.format("~s")).tickSize(0).tickPadding(5);
    
    const gX = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(axisX);
    gX.select(".domain").remove();
    gX.selectAll("text").style("font-weight", "bold");
    
    g.append("g").attr("class", "axis").call(axisY).select(".domain").remove();

    svg.append("text")
        .attr("x", 5)
        .attr("y", 15)
        .attr("fill", "#64748b")
        .style("font-size", "9px")
        .style("font-weight", "bold")
        .text("NEW RELEASES (COUNT)");
}

// 启动 (这里没有多余的花括号了)
init();