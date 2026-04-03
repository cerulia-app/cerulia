package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"cerulia/internal/contract"
)

func main() {
	var (
		outputDirectory = flag.String("out", ".artifacts/contracts", "output directory for generated contract artifact")
		version         = flag.String("version", "0.0.0-dev", "artifact version")
		channel         = flag.String("channel", "next", "compatibility channel")
		gitSHA          = flag.String("git-sha", "", "source git sha")
		gitTag          = flag.String("git-tag", "", "source git tag")
	)
	flag.Parse()

	bundle, err := contract.BuildBundle(contract.Options{
		Version: *version,
		Channel: *channel,
		GitSHA:  *gitSHA,
		GitTag:  *gitTag,
		BuiltAt: time.Now().UTC(),
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "build contract bundle: %v\n", err)
		os.Exit(1)
	}

	if err := bundle.WriteTo(*outputDirectory); err != nil {
		fmt.Fprintf(os.Stderr, "write contract bundle: %v\n", err)
		os.Exit(1)
	}
}
