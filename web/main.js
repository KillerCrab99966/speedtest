let nextTestStartTime;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	while (true) {
		// Fetch the and update results
		const results = await fetchResults();
		if (results) {
			console.log("Fetched results");
			updateCharts(results);
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
		let timeUntilTestFinish =
			nextTestStartTime.getTime() - Date.now() + testDuration;

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

function updateCharts(results) {
	// Convert bytes to megabytes
	results.forEach((r) => {
		r.bytes_sent = Number((r.bytes_sent / (1024 * 1024)).toFixed(2));
		r.bytes_received = Number(
			(r.bytes_received / (1024 * 1024)).toFixed(2),
		);
	});

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

	drawCharts(chartConfigs, results);
}

function drawCharts(chartConfigs, results) {
	const labels = results.map((item) => new Date(item.timestamp));

	chartConfigs.forEach((config) => {
		const data = results.map((item) => item[config.key]);
		drawChart(config.id, labels, config, data);
	});
}

function drawChart(canvasID, labels, config, data) {
	const canvas = document.getElementById(canvasID);
	if (!canvas) return;

	const existingChart = Chart.getChart(canvas);
	if (existingChart) {
		existingChart.destroy();
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
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: {
					ticks: {
						// Format the X-axis labels to show ONLY time
						callback: function (val, _) {
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
						// Format the hover tooltip to show BOTH date and time
						title: function (context) {
							const timestamp = context[0].label;
							return new Date(timestamp).toLocaleString();
						},
					},
				},
			},
		},
	});
}

async function fetchResults() {
	try {
		const response = await fetch("/api/results");

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

main();
