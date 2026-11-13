async function main() {
	// Fetch the results
	const results = await fetch_results();
	console.info("Fetched results");

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
	const labels = results.map((item) =>
		new Date(item.timestamp).toLocaleTimeString(),
	);

	chartConfigs.forEach((config) => {
		const data = results.map((item) => item[config.key]);
		drawChart(config.id, labels, config, data);
	});
}

function drawChart(canvasID, labels, config, data) {
	const canvas = document.getElementById(canvasID);
	if (!canvas) return;

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
				y: {
					beginAtZero: true,
				},
			},
		},
	});
}

async function fetch_results() {
	try {
		const response = await fetch("/api/results");

		if (!response.ok) {
			throw new Error("Failed to fetch results");
		}

		const results = await response.json();
		return results;
	} catch (err) {
		console.error("Error fetching data:", err.message);
	}
}

main();
