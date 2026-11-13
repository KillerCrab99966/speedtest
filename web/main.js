async function main() {
	let results = await fetch_results();
	console.log(results);
}

async function fetch_results() {
	try {
		let response = await fetch("/api/results");

		if (!response.ok) {
			throw new Error("Failed to fetch results");
		}

		let results = await response.json();
		return results;
	} catch (err) {
		console.error("Error fetching data:", err.message);
	}
}

main();
