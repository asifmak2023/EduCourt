<?php

namespace App\Enums;

enum FixtureOutcome: string
{
    case Win = 'win';
    case Loss = 'loss';
    case Draw = 'draw';
}
