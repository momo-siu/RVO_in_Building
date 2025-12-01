package com.rvo.rvoserver;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.ServletComponentScan;
import org.springframework.scheduling.annotation.EnableAsync;

@ServletComponentScan
@SpringBootApplication(exclude = { SecurityAutoConfiguration.class })
@EnableAsync
public class RvoServerApplication {

	public static void main(String[] args) {
		System.out.println("welcome version 2.00");
		SpringApplicationBuilder builder = new SpringApplicationBuilder(RvoServerApplication.class);
		builder.headless(false).run(args);
	}

}
