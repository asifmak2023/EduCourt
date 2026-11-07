<?php

namespace Tests\Unit;

use App\Services\WhatsApp\WhatsAppClient;
use PHPUnit\Framework\TestCase;

class WhatsAppClientTest extends TestCase
{
    private function client(string $countryCode = '92', ?string $token = 'token', ?string $phoneId = '1234'): WhatsAppClient
    {
        return new WhatsAppClient(
            token: $token,
            phoneNumberId: $phoneId,
            baseUrl: 'https://graph.facebook.com/v21.0',
            timeout: 5,
            defaultCountryCode: $countryCode,
        );
    }

    public function test_it_normalizes_an_international_number_with_plus(): void
    {
        $this->assertSame('923001234567', $this->client()->normalizePhone('+92 300 1234567'));
    }

    public function test_it_strips_the_international_00_prefix(): void
    {
        $this->assertSame('923001234567', $this->client()->normalizePhone('00923001234567'));
    }

    public function test_it_replaces_a_national_trunk_zero_with_the_country_code(): void
    {
        $this->assertSame('923001234567', $this->client()->normalizePhone('03001234567'));
    }

    public function test_it_prepends_the_country_code_to_a_bare_national_number(): void
    {
        $this->assertSame('923001234567', $this->client()->normalizePhone('3001234567'));
    }

    public function test_it_leaves_a_number_that_already_has_the_country_code(): void
    {
        $this->assertSame('923001234567', $this->client()->normalizePhone('923001234567'));
    }

    public function test_it_strips_punctuation_and_spaces(): void
    {
        $this->assertSame('923001234567', $this->client()->normalizePhone('+92 (300) 123-4567'));
    }

    public function test_it_rejects_empty_invalid_and_out_of_range_numbers(): void
    {
        $client = $this->client();

        $this->assertNull($client->normalizePhone(''));
        $this->assertNull($client->normalizePhone('   '));
        $this->assertNull($client->normalizePhone('abc'));
        $this->assertNull($client->normalizePhone('123'));
        $this->assertNull($client->normalizePhone('+12345678901234567'));
    }

    public function test_it_reports_whether_it_is_configured(): void
    {
        $this->assertTrue($this->client()->configured());
        $this->assertFalse($this->client(token: null)->configured());
        $this->assertFalse($this->client(phoneId: null)->configured());
    }
}
