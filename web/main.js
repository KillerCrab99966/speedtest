let nextTestStartTime;
let latestResults;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(period, scale) {
	while (true) {
		// Fetch the and update results
		latestResults = await fetchResults(period);
		if (latestResults) {
			console.log("Fetched results");
			updateCharts(latestResults, scale);
			console.log("Updated charts");
		}

		// Fetch and display the time of the next test
		nextTestStartTime = await fetchNext();
		if (!nextTestStartTime || isNaN(nextTestStartTime.getTime())) {
			// Retry in 15 seconds if the fetch failed
			console.log(
				new Date().toLocaleTimeString(),
				"Failed to fetch next test time; retrying in 15s",
			);

			await sleep(15000);
			continue;
		}

		document.getElementById("next-test-time-text").innerText =
			`Next speedtest: ${nextTestStartTime.toLocaleString()}`;

		// Calculate time to next test finishing
		const testDuration = 70000;
		let timeUntilTestFinish = nextTestStartTime.getTime() - Date.now() + testDuration;

		// Ensure time is not greater than integer limit,
		// otherwise it gets set to 0
		const maxWaitTime = 2_147_483_647; // ~24.8 days
		if (timeUntilTestFinish > maxWaitTime) {
			timeUntilTestFinish = maxWaitTime;
		}

		if (timeUntilTestFinish <= 0) {
			// If the test has already finished, check in 10s
			console.log(
				new Date().toLocaleTimeString(),
				"Test finished; checking for next test in 10s",
			);
			timeUntilTestFinish = 10000;
		} else {
			console.log(
				new Date().toLocaleTimeString(),
				`Checking for test result in ${(timeUntilTestFinish / 1000).toFixed(0)}s`,
			);
		}

		await sleep(timeUntilTestFinish);
	}
}

function updateCharts(results, scale) {
	// Convert bytes to megabytes.
	//
	// Results are copied to avoid modifying the cached
	// results each time the charts are updated.
	const processedResults = results.map((r) => ({
		...r,
		bytes_sent: Number((r.bytes_sent / (1024 * 1024)).toFixed(2)),
		bytes_received: Number((r.bytes_received / (1024 * 1024)).toFixed(2)),
	}));

	// Draw the charts
	const chartConfigs = [
		{
			id: "download-speed",
			key: "download",
			label: "Download Speed (Mbps)",
			color: "rgb(75, 192, 192)",
		},
		{
			id: "upload-speed",
			key: "upload",
			label: "Upload Speed (Mbps)",
			color: "rgb(54, 162, 235)",
		},
		{
			id: "bytes-sent",
			key: "bytes_sent",
			label: "Bytes Sent",
			color: "rgb(255, 99, 132)",
		},
		{
			id: "bytes-received",
			key: "bytes_received",
			label: "Bytes Received",
			color: "rgb(255, 159, 64)",
		},
		{
			id: "jitter",
			key: "jitter",
			label: "Jitter (ms)",
			color: "rgb(153, 102, 255)",
		},
		{
			id: "ping",
			key: "ping",
			label: "Ping (ms)",
			color: "rgb(255, 205, 86)",
		},
	];

	drawCharts(chartConfigs, processedResults, scale);
}

function drawCharts(chartConfigs, results, scale) {
	const labels = results.map((item) => new Date(item.timestamp));

	chartConfigs.forEach((config) => {
		let data;
		if (scale == "equal") {
			data = results.map((item) => item[config.key]);
		} else {
			data = results.map((item) => ({
				x: new Date(item.timestamp).getTime(),
				y: item[config.key],
			}));
		}
		drawChart(config.id, labels, config, data, scale);
	});
}

function drawChart(canvasID, labels, config, data, scale) {
	const canvas = document.getElementById(canvasID);
	if (!canvas) return;

	const existingChart = Chart.getChart(canvas);
	if (existingChart) {
		existingChart.destroy();
	}

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			x: {
				ticks: {
					// Format the X-axis labels to show only time
					callback: function (val) {
						const timestamp = this.getLabelForValue(val);
						return new Date(timestamp).toLocaleTimeString();
					},
				},
			},
			y: {
				beginAtZero: true,
			},
		},
		plugins: {
			tooltip: {
				callbacks: {
					// Format the hover tooltip to show both date and time
					title: function (context) {
						const timestamp = context[0].label;
						return new Date(timestamp).toLocaleString();
					},
				},
			},
		},
	};

	// Adjust options for time-based scaling
	if (scale == "time-based") {
		options.scales.x.type = "linear";
		options.scales.x.ticks.callback = function (val) {
			return new Date(val).toLocaleTimeString();
		};
		options.plugins.tooltip.callbacks.title = function (context) {
			const timestamp = context[0].parsed.x;
			return new Date(timestamp).toLocaleString();
		};
	}

	return new Chart(canvas, {
		type: "line",
		data: {
			labels: labels,
			datasets: [
				{
					label: config.label,
					data: data,
					borderColor: config.color,
					backgroundColor: config.color,
					tension: 0.2,
				},
			],
		},
		options: options,
	});
}

async function fetchResults(period) {
	try {
		const response = await fetch(`/api/results?period=${period}`);

		if (!response.ok) {
			throw new Error("Failed to fetch results");
		}

		const results = await response.json();
		return results;
	} catch (err) {
		console.error("Error fetching data:", err.message);
		return null;
	}
}

async function fetchNext() {
	try {
		const response = await fetch("/api/next");

		if (!response.ok) {
			throw new Error("Failed to fetch next test time");
		}

		const next = await response.text();
		return new Date(next);
	} catch (err) {
		console.error("Error fetching next test time:", err.message);
		return null;
	}
}

const resultsPeriod = localStorage.getItem("resultsPeriod") || "24h";
const chartScale = localStorage.getItem("chartScale") || "equal";

main(resultsPeriod, chartScale);

document.getElementById("results-period-select").value = resultsPeriod;

document.getElementById("results-period-select").addEventListener("change", async (event) => {
	const period = event.target.value;
	localStorage.setItem("resultsPeriod", period);

	latestResults = await fetchResults(period);
	if (latestResults) {
		console.log("Fetched results");
		updateCharts(latestResults);
		console.log("Updated charts");
	}
});

document.getElementById("chart-scale-select").value = chartScale;

document.getElementById("chart-scale-select").addEventListener("change", async (event) => {
	const scale = event.target.value;
	localStorage.setItem("chartScale", scale);

	updateCharts(latestResults, scale);
	console.log("Updated charts");
});

document.body.dataset.theme = localStorage.getItem("theme") || "";
updateThemeLinkText(document.body.dataset.theme);

document.getElementById("change-theme-link").addEventListener("click", (event) => {
	event.preventDefault();
	switch (document.body.dataset.theme) {
		case "":
			document.body.dataset.theme = "light";
			break;
		case "light":
			document.body.dataset.theme = "dark";
			break;
		case "dark":
			document.body.dataset.theme = "";
			break;
	}

	const theme = document.body.dataset.theme;
	localStorage.setItem("theme", theme);
	updateThemeLinkText(theme);
});

function updateThemeLinkText(theme) {
	switch (theme) {
		case "":
			document.getElementById("change-theme-link").innerText = "Auto";
			break;
		case "light":
			document.getElementById("change-theme-link").innerText = "Light";
			break;
		case "dark":
			document.getElementById("change-theme-link").innerText = "Dark";
			break;
	}
}
